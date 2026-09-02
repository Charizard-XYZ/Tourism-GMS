import { Router, Response } from 'express';
import { db } from '../config/firebase-admin';
import { authenticateFirebaseToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/role.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { createGrievanceSchema, assignGrievanceSchema, updateGrievanceStatusSchema } from '../validators/schemas';
import { EmailService } from '../services/email.service';

const router = Router();

/**
 * GET /api/grievances
 * Fetch grievances based on role filter
 */
router.get('/', authenticateFirebaseToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { uid, role } = req.user!;
    let query: any = db.collection('grievances');

    if (role === 'citizen') {
      query = query.where('citizenId', '==', uid);
    } else if (role === 'officer') {
      query = query.where('assignedOfficerId', '==', uid);
    }

    const snapshot = await query.get();
    const grievances = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    // Sort by createdAt descending
    grievances.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
    const doc = await db.collection('grievances').doc(id).get();

    if (!doc.exists) {
      res.status(404).json({ success: false, message: 'Grievance not found.' });
      return;
    }

    res.status(200).json({ success: true, grievance: { id: doc.id, ...doc.data() } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error fetching grievance details.' });
  }
});

/**
 * POST /api/grievances
 * Submit new grievance ticket
 */
router.post('/', authenticateFirebaseToken, validateBody(createGrievanceSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { uid, email, displayName, phoneNumber } = req.user!;
    const { title, description, category, departmentId, departmentName, location, attachments } = req.body;

    const docRef = db.collection('grievances').doc();
    const trackingCode = `GMS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newGrievance = {
      id: docRef.id,
      trackingCode,
      title,
      description,
      category,
      departmentId: departmentId || '',
      departmentName: departmentName || category,
      location,
      citizenId: uid,
      citizenName: displayName || 'Tourist',
      citizenEmail: email,
      citizenPhone: phoneNumber || '',
      attachments: attachments || [],
      assignedOfficerId: '',
      assignedOfficerName: '',
      status: 'submitted',
      isEscalated: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await docRef.set(newGrievance);

    // Send Confirmation Email to Tourist
    EmailService.sendGrievanceSubmittedEmail(email, newGrievance.citizenName, trackingCode, title, category);

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

    const gData = doc.data()!;

    await docRef.update({
      departmentId,
      departmentName,
      assignedOfficerId: officerId,
      assignedOfficerName: officerName,
      status: 'assigned',
      updatedAt: new Date().toISOString()
    });

    // Notify Officer via Email
    const officerDoc = await db.collection('users').doc(officerId).get();
    if (officerDoc.exists && officerDoc.data()?.['email']) {
      EmailService.sendOfficerAssignmentEmail(officerDoc.data()!['email'], officerName, gData['trackingCode'], gData['title'], departmentName);
    }

    // Notify Tourist
    if (gData['citizenEmail']) {
      EmailService.sendStatusUpdateEmail(gData['citizenEmail'], gData['citizenName'], gData['trackingCode'], 'assigned');
    }

    res.status(200).json({ success: true, message: 'Grievance assigned successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error assigning grievance.' });
  }
});

/**
 * PATCH /api/grievances/:id/status
 * Update Grievance Status (Officer / Admin)
 */
router.patch('/:id/status', authenticateFirebaseToken, authorizeRoles('admin', 'officer'), validateBody(updateGrievanceStatusSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    const { status, resolutionDetails, resolutionAttachments } = req.body;

    const docRef = db.collection('grievances').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ success: false, message: 'Grievance not found.' });
      return;
    }

    const gData = doc.data()!;
    const updatePayload: Record<string, any> = {
      status,
      updatedAt: new Date().toISOString()
    };

    if (resolutionDetails) updatePayload['resolutionDetails'] = resolutionDetails;
    if (resolutionAttachments) updatePayload['resolutionAttachments'] = resolutionAttachments;
    if (status === 'resolved') updatePayload['resolvedAt'] = new Date().toISOString();

    await docRef.update(updatePayload);

    // Send Email to Tourist
    if (gData['citizenEmail']) {
      if (status === 'resolved') {
        EmailService.sendResolutionEmail(gData['citizenEmail'], gData['citizenName'], gData['trackingCode'], resolutionDetails);
      } else {
        EmailService.sendStatusUpdateEmail(gData['citizenEmail'], gData['citizenName'], gData['trackingCode'], status);
      }
    }

    res.status(200).json({ success: true, message: 'Grievance status updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error updating grievance status.' });
  }
});

export default router;
