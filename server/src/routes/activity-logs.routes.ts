import { Router, Response } from 'express';
import { db } from '../config/firebase-admin';
import { authenticateFirebaseToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/role.middleware';

const router = Router();

/**
 * GET /api/activity-logs
 */
router.get('/', authenticateFirebaseToken, authorizeRoles('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const snapshot = await db.collection('activityLogs').limit(200).get();
    const logs = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    logs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.status(200).json({ success: true, logs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error retrieving activity logs.' });
  }
});

/**
 * POST /api/activity-logs
 */
router.post('/', authenticateFirebaseToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { uid, role, displayName } = req.user!;
    const { action, module, targetId, details } = req.body;

    const docRef = db.collection('activityLogs').doc();
    const logDoc = {
      id: docRef.id,
      userId: uid,
      userName: displayName || 'User',
      userRole: role,
      action: action || 'USER_ACTION',
      module: module || 'System',
      targetId: targetId || '',
      details: details || '',
      timestamp: new Date().toISOString()
    };

    await docRef.set(logDoc);

    res.status(201).json({ success: true, log: logDoc });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error creating activity log.' });
  }
});

export default router;
