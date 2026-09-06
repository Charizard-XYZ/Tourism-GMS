import { Router, Response } from 'express';
import { db } from '../config/firebase-admin';
import { authenticateFirebaseToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { submitFeedbackSchema } from '../validators/schemas';

const router = Router();

/**
 * GET /api/feedback
 */
router.get('/', authenticateFirebaseToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const snapshot = await db.collection('feedbacks').get();
    const feedbacks = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    res.status(200).json({ success: true, feedbacks });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error retrieving feedback.' });
  }
});

/**
 * POST /api/feedback
 * Submit feedback on resolved grievance
 * Tourist can only submit feedback on resolved grievances. Submitting feedback closes the grievance.
 */
router.post('/', authenticateFirebaseToken, validateBody(submitFeedbackSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { uid, displayName, role } = req.user!;
    const { grievanceId, rating, comments, autoClose } = req.body;

    const gRef = db.collection('grievances').doc(grievanceId);
    const gDoc = await gRef.get();

    if (!gDoc.exists) {
      res.status(404).json({ success: false, message: 'Grievance not found.' });
      return;
    }

    const gData = gDoc.data()!;

    // Check ownership: Tourist must own the grievance, or Admin
    if (role !== 'admin' && gData['touristId'] !== uid) {
      res.status(403).json({ success: false, message: 'Forbidden: You can only submit feedback for your own grievances.' });
      return;
    }

    // Must be in 'resolved' status (or 'closed' if already closed)
    if (gData['status'] !== 'resolved' && gData['status'] !== 'closed') {
      res.status(400).json({
        success: false,
        message: 'Feedback can only be provided for resolved grievances.'
      });
      return;
    }

    // Prevent duplicate feedback submissions
    if (gData['feedbackId']) {
      res.status(400).json({
        success: false,
        message: 'Feedback has already been submitted for this grievance.'
      });
      return;
    }

    const code = gData['grievanceCode'] || gData['trackingCode'] || '';
    const touristName = displayName || gData['touristName'] || 'Tourist';
    const now = new Date().toISOString();

    const docRef = db.collection('feedbacks').doc();
    const feedbackDoc = {
      id: docRef.id,
      feedbackId: docRef.id,
      grievanceId,
      grievanceCode: code,
      touristId: uid,
      touristName,
      rating,
      comment: comments || '',
      feedback: comments || '',
      comments: comments || '',
      createdAt: now
    };

    const batch = db.batch();
    // Save feedback in feedbacks collection ONLY
    batch.set(docRef, feedbackDoc);

    // Atomically transition grievance to 'closed' and attach feedback ID
    const grievanceUpdates: Record<string, any> = {
      feedbackId: docRef.id,
      rating,
      feedbackComments: comments || '',
      updatedAt: now
    };

    if (autoClose !== false || gData['status'] === 'resolved') {
      grievanceUpdates['status'] = 'closed';
      grievanceUpdates['closedAt'] = now;
    }

    batch.update(gRef, grievanceUpdates);
    await batch.commit();

    res.status(201).json({ success: true, message: 'Feedback submitted successfully', feedback: feedbackDoc });
  } catch (error: any) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ success: false, message: 'Error submitting feedback.' });
  }
});

export default router;
