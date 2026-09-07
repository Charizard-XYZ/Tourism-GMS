import { Router, Response } from 'express';
import { db } from '../config/firebase-admin';
import { authenticateFirebaseToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/role.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { createGrievanceSchema, assignGrievanceSchema, updateGrievanceStatusSchema } from '../validators/schemas';
import { EmailService } from '../services/email.service';
import { generateUniqueGrievanceCode } from '../utils/user-code';
import { autoDistributeDepartmentUnassignedGrievances } from '../services/redistribution.service';
import { logActivity } from '../utils/activity-logger';

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
      // Officer sees active non-cancelled grievances assigned to them
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanName = (req.user?.displayName || '').trim().toLowerCase();

      grievances = grievances.filter((g: any) => {
        if (g.status === 'cancelled') {
          return false;
        }
        const assignedId = (g.assignedOfficerId || '').trim();
        const assignedName = (g.assignedOfficerName || '').trim().toLowerCase();

        return (assignedId === uid) ||
          (cleanEmail && assignedId.toLowerCase() === cleanEmail) ||
          (cleanName && assignedName === cleanName);
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
    const { uid, role, email, departmentId, departmentName } = req.user!;
    const doc = await db.collection('grievances').doc(id).get();

    if (!doc.exists) {
      res.status(404).json({ success: false, message: 'Grievance not found.' });
      return;
    }

    const gData = doc.data()!;

    // IDOR protection: Verify viewer has authorization to access this grievance
    if (role === 'officer') {
      const isOfficerDept = (departmentId && gData['departmentId'] === departmentId) ||
        (departmentName && gData['departmentName'] && gData['departmentName'].trim().toLowerCase() === departmentName.trim().toLowerCase()) ||
        (gData['assignedOfficerId'] === uid);
      if (!isOfficerDept) {
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
      assignedOfficerId: '',
      assignedOfficerName: '',
      status: 'submitted',
      isEscalated: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await docRef.set(newGrievance);

    // Send Confirmation Email to Tourist (asynchronously, failure never breaks submission)
    EmailService.sendGrievanceFiledEmail(email, {
      touristName: newGrievance.touristName,
      grievanceCode,
      title: newGrievance.title,
      category: effectiveDeptName,
      submittedAt: newGrievance.createdAt,
      status: newGrievance.status,
      location: newGrievance.location
    }).catch(emailErr => {
      console.error('[EMAIL DISPATCH ERROR] Grievance filed notification failed:', emailErr?.message || emailErr);
    });

    // If department has active officers assigned, automatically distribute to balance workload
    try {
      await autoDistributeDepartmentUnassignedGrievances(deptDoc.id, effectiveDeptName);
    } catch (distErr) {
      console.warn('Auto-distribution notice on grievance submit:', distErr);
    }

    const savedDoc = await docRef.get();
    const finalGrievance = { id: docRef.id, ...savedDoc.data() };

    // Record activity log
    logActivity(
      uid,
      displayName || 'Tourist',
      req.user?.role || 'tourist',
      'SUBMIT_GRIEVANCE',
      'Grievances',
      docRef.id,
      `Lodged grievance ticket ${grievanceCode}: "${title}" in department "${effectiveDeptName}"`
    ).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Grievance registered successfully',
      grievance: finalGrievance
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

    // Validate target officer if officerId is provided
    let targetOfficerEmail: string | null = null;
    if (officerId) {
      const [targetOffDoc, targetUserDoc] = await Promise.all([
        db.collection('officers').doc(officerId).get(),
        db.collection('users').doc(officerId).get()
      ]);
      const targetData = targetOffDoc.exists ? targetOffDoc.data() : (targetUserDoc.exists ? targetUserDoc.data() : null);
      if (!targetData) {
        res.status(404).json({ success: false, message: 'Assigned officer not found.' });
        return;
      }
      if (targetData['isRevoked'] || targetData['isActive'] === false) {
        res.status(400).json({ success: false, message: 'Cannot assign grievance to a revoked or inactive officer.' });
        return;
      }
      targetOfficerEmail = targetData['email'] || null;
    }

    let grievanceData: any = null;
    const now = new Date().toISOString();

    await db.runTransaction(async (transaction) => {
      // 1. Retrieve the current grievance inside the transaction
      const doc = await transaction.get(docRef);
      if (!doc.exists) {
        throw { statusCode: 404, message: 'Grievance not found.' };
      }

      const currentData = doc.data()!;
      grievanceData = currentData;

      if (currentData['status'] === 'cancelled') {
        throw { statusCode: 400, message: 'Cancelled grievances cannot be assigned or treated as active assignments.' };
      }

      // 2. Check whether an active Officer is already assigned
      const existingOfficerId = (currentData['assignedOfficerId'] || '').trim();

      if (existingOfficerId) {
        // Read existing officer document to check if active
        const existingOffRef = db.collection('officers').doc(existingOfficerId);
        const existingUserRef = db.collection('users').doc(existingOfficerId);
        const [existingOffDoc, existingUserDoc] = await Promise.all([
          transaction.get(existingOffRef),
          transaction.get(existingUserRef)
        ]);

        const existingData = existingOffDoc.exists ? existingOffDoc.data() : (existingUserDoc.exists ? existingUserDoc.data() : null);
        const isOfficerStillActive = existingData ? (!existingData['isRevoked'] && existingData['isActive'] !== false) : true;

        if (isOfficerStillActive) {
          // 3. If assigned, reject the new assignment
          throw { statusCode: 400, message: 'This grievance is already assigned to an Officer.' };
        }
      }

      // 4. If unassigned, perform the assignment atomically
      transaction.update(docRef, {
        departmentId,
        departmentName,
        departmentDeleted: false,
        assignedOfficerId: officerId,
        assignedOfficerName: officerName,
        status: currentData['status'] === 'submitted' ? 'assigned' : currentData['status'],
        updatedAt: now
      });
    });

    // Notify Officer via Email (asynchronously after successful commit)
    if (officerId && targetOfficerEmail) {
      EmailService.sendOfficerAssignmentEmail(
        targetOfficerEmail,
        {
          officerName,
          grievanceCode: grievanceData['trackingCode'] || grievanceData['grievanceCode'] || id,
          title: grievanceData['title'] || 'Grievance Ticket',
          category: departmentName,
          assignedAt: now
        }
      ).catch((err) => console.warn('Failed to send officer assignment email:', err));
    }

    // Record activity log
    logActivity(
      req.user!.uid,
      req.user!.displayName || 'Admin',
      'admin',
      'ASSIGN_GRIEVANCE',
      'Grievances',
      id,
      `Assigned grievance ticket ${grievanceData['trackingCode'] || id} to officer "${officerName}" (${departmentName})`
    ).catch(() => {});

    res.status(200).json({ success: true, message: 'Grievance assigned successfully' });
  } catch (error: any) {
    if (error?.statusCode && error?.message) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error('Error assigning grievance:', error);
    res.status(500).json({ success: false, message: error?.message || 'Error assigning grievance.' });
  }
});

/**
 * PATCH /api/grievances/:id/status
 * Update Grievance Status (Assigned Officer Only)
 * Admin is explicitly forbidden from changing grievance status or resolving on behalf of officers.
 * Officer can only update grievances actually assigned to them.
 * If department is inactive, Officers cannot update grievance progress.
 */
router.patch('/:id/status', authenticateFirebaseToken, authorizeRoles('officer'), validateBody(updateGrievanceStatusSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    const { uid, email } = req.user!;
    const { status, resolutionDetails, resolutionAttachments } = req.body;

    const docRef = db.collection('grievances').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ success: false, message: 'Grievance not found.' });
      return;
    }

    const gData = doc.data()!;

    if (gData['status'] === 'cancelled') {
      res.status(400).json({ success: false, message: 'Cancelled grievances cannot be updated or processed.' });
      return;
    }

    if (req.user?.['isRevoked'] === true) {
      res.status(403).json({ success: false, message: 'Revoked officers lose authority to update grievances.' });
      return;
    }

    // Strictly enforce: Only the assigned Officer can update the grievance status
    const assignedId = gData['assignedOfficerId'];
    const isAssignedOfficer = assignedId === uid || (email && assignedId === email);

    if (!isAssignedOfficer) {
      res.status(403).json({ success: false, message: 'Forbidden: Only the assigned officer can update this grievance.' });
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

    const updatePayload: Record<string, any> = {
      status,
      updatedAt: new Date().toISOString()
    };

    if (resolutionDetails) updatePayload['resolutionDetails'] = resolutionDetails;
    if (resolutionAttachments) updatePayload['resolutionAttachments'] = resolutionAttachments;
    if (status === 'resolved') updatePayload['resolvedAt'] = new Date().toISOString();

    await docRef.update(updatePayload);

    // Send Email to Tourist
    const code = gData['grievanceCode'] || gData['trackingCode'];
    const touristEmail = gData['touristEmail'];
    const touristName = gData['touristName'] || 'Tourist';
    if (touristEmail) {
      if (status === 'resolved') {
        EmailService.sendResolutionEmail(touristEmail, touristName, code, resolutionDetails);
      } else {
        EmailService.sendStatusUpdateEmail(touristEmail, touristName, code, status);
      }
    }

    // Record activity log
    logActivity(
      uid,
      req.user!.displayName || 'Officer',
      'officer',
      'UPDATE_STATUS',
      'Grievances',
      id,
      `Officer updated grievance ticket ${code || id} status to "${status}"`
    ).catch(() => {});

    res.status(200).json({ success: true, message: 'Grievance status updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error updating grievance status.' });
  }
});

/**
 * PATCH /api/grievances/:id/cancel
 * Tourist cancels own eligible grievance ticket
 * Admin is explicitly forbidden from cancelling grievances.
 * Tourist cannot cancel another tourist's grievance.
 */
router.patch('/:id/cancel', authenticateFirebaseToken, authorizeRoles('tourist'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    const { uid, email } = req.user!;
    const docRef = db.collection('grievances').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ success: false, message: 'Grievance not found.' });
      return;
    }

    const gData = doc.data()!;
    const ownerId = gData['touristId'];
    const ownerEmail = gData['touristEmail'];
    if (ownerId !== uid && (!ownerEmail || ownerEmail !== email)) {
      res.status(403).json({ success: false, message: 'Forbidden: You can only cancel your own grievances.' });
      return;
    }

    if (gData['status'] === 'cancelled') {
      res.status(400).json({ success: false, message: 'Grievance is already cancelled.' });
      return;
    }

    if (gData['status'] === 'closed') {
      res.status(400).json({ success: false, message: 'Closed grievances cannot be cancelled.' });
      return;
    }

    await docRef.update({
      status: 'cancelled',
      updatedAt: new Date().toISOString()
    });

    const touristEmail = gData['touristEmail'];
    const touristName = gData['touristName'] || 'Tourist';
    const code = gData['trackingCode'] || gData['grievanceCode'];
    if (touristEmail) {
      EmailService.sendStatusUpdateEmail(touristEmail, touristName, code, 'cancelled');
    }

    // Record activity log
    logActivity(
      uid,
      touristName,
      'tourist',
      'CANCEL_GRIEVANCE',
      'Grievances',
      id,
      `Tourist cancelled grievance ticket ${code || id}`
    ).catch(() => {});

    res.status(200).json({ success: true, message: 'Grievance cancelled successfully', grievance: { id, ...gData, status: 'cancelled' } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error cancelling grievance.' });
  }
});

/**
 * DELETE /api/grievances/:id
 * Permanently delete a cancelled grievance (Tourist owner only)
 * Admin is explicitly forbidden from deleting grievances.
 * Tourist can delete ONLY their own grievance and ONLY after it has been cancelled.
 */
router.delete('/:id', authenticateFirebaseToken, authorizeRoles('tourist'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    const { uid, email } = req.user!;
    const docRef = db.collection('grievances').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ success: false, message: 'Grievance not found.' });
      return;
    }

    const gData = doc.data()!;
    const ownerId = gData['touristId'];
    const ownerEmail = gData['touristEmail'];

    // Enforce ownership: Grievance must belong to the authenticated Tourist
    if (ownerId !== uid && (!ownerEmail || ownerEmail !== email)) {
      res.status(403).json({ success: false, message: 'Forbidden: You can only delete your own grievances.' });
      return;
    }

    // Enforce status: Grievance status must be exactly Cancelled
    if (gData['status'] !== 'cancelled') {
      res.status(400).json({
        success: false,
        message: 'Forbidden: Grievance cannot be deleted. Only cancelled grievances can be permanently deleted.'
      });
      return;
    }

    const code = gData['trackingCode'] || gData['grievanceCode'];

    // Delete ONLY this grievance document
    await docRef.delete();

    // Record activity log
    logActivity(
      uid,
      gData['touristName'] || 'Tourist',
      'tourist',
      'DELETE_GRIEVANCE',
      'Grievances',
      id,
      `Tourist permanently deleted cancelled grievance ticket ${code || id}`
    ).catch(() => {});

    res.status(200).json({ success: true, message: 'Grievance deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error deleting grievance.' });
  }
});

export default router;
