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
    const snapshot = await db.collection('feedback').get();
    const feedbacks = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    res.status(200).json({ success: true, feedbacks });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error retrieving feedback.' });
  }
});

/**
 * POST /api/feedback
 * Submit feedback on resolved grievance
 */
router.post('/', authenticateFirebaseToken, validateBody(submitFeedbackSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { uid, displayName } = req.user!;
    const { grievanceId, rating, comments, autoClose } = req.body;

    const docRef = db.collection('feedback').doc();
    const feedbackDoc = {
      id: docRef.id,
      grievanceId,
      touristId: uid,
      touristName: displayName || 'Tourist',
      rating,
      comments: comments || '',
      createdAt: new Date().toISOString()
    };

    await docRef.set(feedbackDoc);

    // Optionally auto-close grievance ticket
    if (autoClose) {
      const gRef = db.collection('grievances').doc(grievanceId);
      await gRef.update({
        status: 'closed',
        updatedAt: new Date().toISOString()
      });
    }

    res.status(201).json({ success: true, message: 'Feedback submitted successfully', feedback: feedbackDoc });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error submitting feedback.' });
  }
});

export default router;
