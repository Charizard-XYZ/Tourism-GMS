import { Router, Response } from 'express';
import { db } from '../config/firebase-admin';
import { authenticateFirebaseToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/role.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { createGrievanceSchema, assignGrievanceSchema, updateGrievanceStatusSchema } from '../validators/schemas';
import { EmailService } from '../services/email.service';
import { generateUniqueGrievanceCode } from '../utils/user-code';
import { sanitizeGrievanceAssignments } from './officers.routes';

const router = Router();

/**
 * GET /api/grievances
 * Fetch grievances scoped by user role
 */
router.get('/', authenticateFirebaseToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { role, uid, email } = req.user!;
    const snapshot = await db.collection('grievances').get();
    let grievances = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    if (role === 'admin') {
      // Admin sees all valid grievances
    } else if (role === 'officer') {
      // Officer sees only grievances assigned to them, and must be active/processable (not cancelled)
      grievances = grievances.filter((g: any) => {
        return g.assignedOfficerId === uid && g.status !== 'cancelled';
      });
    } else {
      // Tourist sees their own lodged grievances
      grievances = grievances.filter((g: any) => g.touristId === uid || (email && g.touristEmail === email));
    }

    // Sort newest first
    grievances.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    res.status(200).json({ success: true, grievances });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error retrieving grievances.' });
  }
});

/**
 * GET /api/grievances/:id
 */
router.get('/:id', authenticateFirebaseToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    const { uid, role, email } = req.user!;
    const doc = await db.collection('grievances').doc(id).get();

    if (!doc.exists) {
      res.status(404).json({ success: false, message: 'Grievance not found.' });
      return;
    }

    const gData = doc.data()!;

    // IDOR protection: Verify viewer has authorization to access this grievance
    if (role === 'officer') {
      if (gData['assignedOfficerId'] !== uid || gData['status'] === 'cancelled') {
        res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to view this grievance.' });
        return;
      }
    } else if (role !== 'admin') {
      const ownerId = gData['touristId'];
      const ownerEmail = gData['touristEmail'];
      if (ownerId !== uid && ownerEmail !== email) {
        res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to view this grievance.' });
        return;
      }
    }

    res.status(200).json({ success: true, grievance: { id: doc.id, ...gData } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error fetching grievance details.' });
  }
});

/**
 * POST /api/grievances
 * Submit new grievance ticket (Tourist must select an active department)
 */
router.post('/', authenticateFirebaseToken, validateBody(createGrievanceSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { uid, email, displayName, phoneNumber } = req.user!;
    const { title, description, category, departmentId, departmentName, location, attachments } = req.body;

    // Validate that departmentId points to an existing, ACTIVE department
    const deptDoc = await db.collection('departments').doc(departmentId).get();
    if (!deptDoc.exists) {
      res.status(400).json({
        success: false,
        message: 'Invalid department: Selected department does not exist.'
      });
      return;
    }

    const deptData = deptDoc.data()!;
    if (deptData['isActive'] === false) {
      res.status(400).json({
        success: false,
        message: 'Invalid department: Only active departments may be selected for grievance submission.'
      });
      return;
    }

    const docRef = db.collection('grievances').doc();
    const grievanceCode = await generateUniqueGrievanceCode();
    const effectiveDeptName = deptData['name'] || departmentName || category;
    const effectiveDeptCode = deptData['code'] || '';

    // Automatic Officer Assignment
    const targetDeptId = deptDoc.id;
    const targetDeptName = (effectiveDeptName || '').trim().toLowerCase();

    // Query officers from 'officers' collection
    const officersSnapshot = await db.collection('officers').get();
    let officers = officersSnapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    // Backfill any officers stored only in 'users' with role 'officer'
    const usersSnapshot = await db.collection('users').where('role', '==', 'officer').get();
    const existingIds = new Set(officers.map((o: any) => o.id || o.uid));
    for (const uDoc of usersSnapshot.docs) {
      if (!existingIds.has(uDoc.id)) {
        officers.push({ id: uDoc.id, ...uDoc.data() });
      }
    }

    // Filter eligible officers:
    // - Department matches (departmentId or departmentName)
    // - Active (isActive !== false)
    // - Not revoked (isRevoked !== true)
    const eligibleOfficers = officers.filter((o: any) => {
      if (o.isActive === false) return false;
      if (o.isRevoked === true) return false;
      const oDeptId = o.departmentId;
      const oDeptName = (o.departmentName || '').trim().toLowerCase();
      return (oDeptId && oDeptId === targetDeptId) ||
             (oDeptName && oDeptName !== 'unassigned' && oDeptName === targetDeptName);
    });

    let assignedOfficerId = '';
    let assignedOfficerName = '';
    let assignedOfficerEmail = '';
    let status: 'assigned' | 'submitted' = 'submitted';

    if (eligibleOfficers.length > 0) {
      if (eligibleOfficers.length === 1) {
        const sel = eligibleOfficers[0];
        assignedOfficerId = sel.uid || sel.id;
        assignedOfficerName = sel.fullName || sel.name || sel.displayName || 'Officer';
        assignedOfficerEmail = sel.email || '';
        status = 'assigned';
      } else {
        // Multiple active officers in same department:
        // Distribute load by counting active grievances assigned to each officer
        const activeGrievancesSnap = await db.collection('grievances')
          .where('status', 'in', ['submitted', 'assigned', 'in_progress', 'reopened'])
          .get();

        const loadMap = new Map<string, number>();
        for (const off of eligibleOfficers) {
          loadMap.set(off.uid || off.id, 0);
        }
        for (const gDoc of activeGrievancesSnap.docs) {
          const offId = gDoc.data()['assignedOfficerId'];
          if (offId && loadMap.has(offId)) {
            loadMap.set(offId, (loadMap.get(offId) || 0) + 1);
          }
        }

        eligibleOfficers.sort((a: any, b: any) => {
          const idA = a.uid || a.id;
          const idB = b.uid || b.id;
          const loadA = loadMap.get(idA) || 0;
          const loadB = loadMap.get(idB) || 0;
          if (loadA !== loadB) return loadA - loadB;
          return (idA || '').localeCompare(idB || '');
        });

        const sel = eligibleOfficers[0];
        assignedOfficerId = sel.uid || sel.id;
        assignedOfficerName = sel.fullName || sel.name || sel.displayName || 'Officer';
        assignedOfficerEmail = sel.email || '';
        status = 'assigned';
      }
    }

    const newGrievance = {
      id: docRef.id,
      grievanceCode,
      trackingCode: grievanceCode, // backward-compatible alias
      title: title.trim(),
      description: description.trim(),
      category: effectiveDeptName,
      departmentId: deptDoc.id,
      departmentName: effectiveDeptName,
      departmentCode: effectiveDeptCode,
      originalDepartmentName: effectiveDeptName,
      originalDepartmentCode: effectiveDeptCode,
      departmentDeleted: false,
      location: location.trim(),
      touristId: uid,
      touristName: displayName || 'Tourist',
      touristEmail: email,
      touristPhone: phoneNumber || '',
      attachments: attachments || [],
      assignedOfficerId,
      assignedOfficerName,
      status,
      isEscalated: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await docRef.set(newGrievance);

    // Send Confirmation Email to Tourist
    EmailService.sendGrievanceSubmittedEmail(email, newGrievance.touristName, grievanceCode, title, effectiveDeptName);

    // Send Assignment Email to Assigned Officer
    if (assignedOfficerEmail) {
      EmailService.sendOfficerAssignmentEmail(assignedOfficerEmail, assignedOfficerName, grievanceCode, title, effectiveDeptName);
    }

    res.status(201).json({
      success: true,
      message: 'Grievance registered successfully',
      grievance: newGrievance
    });
  } catch (error: any) {
    console.error('Error submitting grievance:', error);
    res.status(500).json({ success: false, message: 'Failed to submit grievance.' });
  }
});

/**
 * PATCH /api/grievances/:id/assign
 * Admin assign grievance to department & officer
 */
router.patch('/:id/assign', authenticateFirebaseToken, authorizeRoles('admin'), validateBody(assignGrievanceSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    const { departmentId, departmentName, officerId, officerName } = req.body;

    const docRef = db.collection('grievances').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ success: false, message: 'Grievance not found.' });
      return;
    }

    const currentData = doc.data()!;
    if (currentData['status'] === 'closed') {
      res.status(400).json({ success: false, message: 'Closed grievances are permanently archived and cannot be reassigned.' });
      return;
    }

    const grievanceDeptId = currentData['departmentId'];
    const grievanceDeptName = currentData['departmentName'] || currentData['category'] || '';

    // Validate Officer if assigned
    if (officerId) {
      const [offDoc, userDoc] = await Promise.all([
        db.collection('officers').doc(officerId).get(),
        db.collection('users').doc(officerId).get()
      ]);

      if (!offDoc.exists && !userDoc.exists) {
        res.status(400).json({ success: false, message: 'Assigned officer does not exist.' });
        return;
      }

      const offData = (offDoc.exists ? offDoc.data() : userDoc.data()) || {};

      if (offData['isRevoked'] === true || offData['isActive'] === false) {
        res.status(400).json({ success: false, message: 'Officer is inactive or revoked and cannot be assigned.' });
        return;
      }

      const offDeptId = offData['departmentId'];
      const offDeptName = (offData['departmentName'] || '').trim().toLowerCase();
      const targetGrievanceDeptName = grievanceDeptName.trim().toLowerCase();

      // Cross-department check: Officer must belong to the grievance's department
      const matchesDept = (grievanceDeptId && offDeptId === grievanceDeptId) ||
        (targetGrievanceDeptName && offDeptName && offDeptName !== 'unassigned' && offDeptName === targetGrievanceDeptName);

      if (!matchesDept) {
        res.status(400).json({
          success: false,
          message: "Cross-department assignment rejected: Officer does not belong to the grievance's department."
        });
        return;
      }
    }

    const isNewAssignment = !currentData['assignedOfficerId'] || currentData['assignedOfficerId'] !== officerId;

    await docRef.update({
      departmentDeleted: false,
      assignedOfficerId: officerId || '',
      assignedOfficerName: officerName || '',
      status: currentData['status'] === 'submitted' ? (officerId ? 'assigned' : 'submitted') : currentData['status'],
      updatedAt: new Date().toISOString()
    });

    // Notify Officer via Email
    if (isNewAssignment && officerId) {
      const officerDoc = await db.collection('officers').doc(officerId).get();
      const officerEmail = officerDoc.exists ? officerDoc.data()?.['email'] : (await db.collection('users').doc(officerId).get()).data()?.['email'];
      if (officerEmail) {
        EmailService.sendOfficerAssignmentEmail(
          officerEmail,
          officerName || 'Officer',
          currentData['trackingCode'] || currentData['grievanceCode'],
          currentData['title'],
          grievanceDeptName
        );
      }
    }

    res.status(200).json({ success: true, message: 'Grievance assigned successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error assigning grievance.' });
  }
});

/**
 * PATCH /api/grievances/:id/status
 * Update Grievance Status (Officer / Admin)
 * If department is inactive, Officers cannot update grievance progress.
 */
router.patch('/:id/status', authenticateFirebaseToken, authorizeRoles('admin', 'officer'), validateBody(updateGrievanceStatusSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    const { role, uid } = req.user!;
    const { status, resolutionDetails, resolutionAttachments } = req.body;

    const docRef = db.collection('grievances').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ success: false, message: 'Grievance not found.' });
      return;
    }

    const gData = doc.data()!;

    if (gData['status'] === 'closed') {
      res.status(400).json({ success: false, message: 'Closed grievances are finalized and cannot be modified.' });
      return;
    }

    // Check if Officer has authority
    if (role === 'officer') {
      if (req.user?.['isRevoked'] === true) {
        res.status(403).json({ success: false, message: 'Revoked officers lose authority to update grievances.' });
        return;
      }

      if (gData['status'] === 'cancelled') {
        res.status(400).json({ success: false, message: 'Cancelled grievances cannot be updated.' });
        return;
      }

      if (gData['assignedOfficerId'] !== uid) {
        res.status(403).json({ success: false, message: 'You do not have permission to update this grievance.' });
        return;
      }

      // Check if department is inactive
      if (gData['departmentId']) {
        const deptDoc = await db.collection('departments').doc(gData['departmentId']).get();
        if (deptDoc.exists && deptDoc.data()?.['isActive'] === false) {
          res.status(400).json({
            success: false,
            message: 'Department is inactive. Officers cannot update grievance progress.'
          });
          return;
        }
      }
    }

    const updatePayload: Record<string, any> = {
      status,
      updatedAt: new Date().toISOString()
    };

    if (resolutionDetails) updatePayload['resolutionDetails'] = resolutionDetails;
    if (resolutionAttachments) updatePayload['resolutionAttachments'] = resolutionAttachments;
    if (status === 'resolved') {
      updatePayload['resolvedAt'] = new Date().toISOString();
      updatePayload['resolvedByOfficerId'] = uid || gData['assignedOfficerId'] || '';
      updatePayload['resolvedByOfficerName'] = req.user?.displayName || gData['assignedOfficerName'] || 'Officer';
    }

    await docRef.update(updatePayload);

    // Send Email to Tourist (non-blocking)
    const code = gData['grievanceCode'] || gData['trackingCode'];
    const touristEmail = gData['touristEmail'];
    const touristName = gData['touristName'] || 'Tourist';
    if (touristEmail) {
      if (status === 'resolved') {
        EmailService.sendResolutionEmail(touristEmail, touristName, code, resolutionDetails).catch(() => {});
      } else {
        EmailService.sendStatusUpdateEmail(touristEmail, touristName, code, status).catch(() => {});
      }
    }

    res.status(200).json({ success: true, message: 'Grievance status updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error updating grievance status.' });
  }
});

/**
 * PATCH /api/grievances/:id/cancel
 * Tourist cancels own eligible grievance ticket (or Admin)
 */
router.patch('/:id/cancel', authenticateFirebaseToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    const { uid, role, email } = req.user!;
    const docRef = db.collection('grievances').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ success: false, message: 'Grievance not found.' });
      return;
    }

    const gData = doc.data()!;
    const ownerId = gData['touristId'];
    const ownerEmail = gData['touristEmail'];
    if (role !== 'admin' && ownerId !== uid && ownerEmail !== email) {
      res.status(403).json({ success: false, message: 'Forbidden: You can only cancel your own grievances.' });
      return;
    }

    if (gData['status'] === 'cancelled') {
      res.status(400).json({ success: false, message: 'Grievance is already cancelled.' });
      return;
    }

    if (gData['status'] === 'resolved' || gData['status'] === 'closed') {
      res.status(400).json({ success: false, message: 'Resolved or closed grievances cannot be cancelled.' });
      return;
    }

    await docRef.update({
      status: 'cancelled',
      updatedAt: new Date().toISOString()
    });

    const touristEmail = gData['touristEmail'];
    const touristName = gData['touristName'] || 'Tourist';
    if (touristEmail) {
      EmailService.sendStatusUpdateEmail(touristEmail, touristName, gData['trackingCode'] || gData['grievanceCode'], 'cancelled').catch(() => {});
    }

    res.status(200).json({ success: true, message: 'Grievance cancelled successfully', grievance: { id, ...gData, status: 'cancelled' } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error cancelling grievance.' });
  }
});

/**
 * DELETE /api/grievances/:id
 * Delete a cancelled grievance (Tourist owner or Admin only)
 */
router.delete('/:id', authenticateFirebaseToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    const { uid, role, email } = req.user!;
    const docRef = db.collection('grievances').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ success: false, message: 'Grievance not found.' });
      return;
    }

    const gData = doc.data()!;
    const ownerId = gData['touristId'];
    const ownerEmail = gData['touristEmail'];
    if (role !== 'admin' && ownerId !== uid && ownerEmail !== email) {
      res.status(403).json({ success: false, message: 'Forbidden: You can only delete your own grievances.' });
      return;
    }

    if (gData['status'] === 'resolved' || gData['status'] === 'closed') {
      res.status(400).json({ success: false, message: 'Resolved grievances cannot be deleted.' });
      return;
    }

    if (gData['status'] !== 'cancelled') {
      res.status(400).json({ success: false, message: 'Only cancelled grievances can be permanently deleted.' });
      return;
    }

    await docRef.delete();
    res.status(200).json({ success: true, message: 'Grievance deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error deleting grievance.' });
  }
});

export default router;
