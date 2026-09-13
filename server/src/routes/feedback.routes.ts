import { Router, Response } from 'express';
import { db } from '../config/firebase-admin';
import { authenticateFirebaseToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/role.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { submitFeedbackSchema } from '../validators/schemas';
import { logActivity } from '../utils/activity-logger';

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
 * Submit feedback on resolved grievance.
 * BUSINESS RULE: Only the original tourist who filed the grievance can submit feedback.
 * Feedback submission automatically closes the grievance.
 * This is the ONLY mechanism that can transition a grievance to 'closed' status.
 */
router.post('/', authenticateFirebaseToken, authorizeRoles('tourist'), validateBody(submitFeedbackSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { uid, displayName } = req.user!;
    const { grievanceId, rating, comments, resolutionSatisfactory } = req.body;

    // 1. Validate grievance exists
    const gRef = db.collection('grievances').doc(grievanceId);
    const gDoc = await gRef.get();

    if (!gDoc.exists) {
      res.status(404).json({ success: false, message: 'Grievance not found.' });
      return;
    }

    const gData = gDoc.data()!;

    // 2. Validate ownership: Only the tourist who filed this grievance can submit feedback
    const grievanceTouristId = gData['touristId'];
    if (grievanceTouristId !== uid) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Only the tourist who originally filed this grievance can submit feedback.'
      });
      return;
    }

    // 3. Validate eligibility: Grievance must be in 'resolved' status to receive feedback
    //    If already 'closed', feedback has already been submitted.
    const currentStatus = gData['status'];
    if (currentStatus === 'closed') {
      res.status(409).json({
        success: false,
        message: 'Feedback has already been submitted for this grievance. Duplicate submissions are not allowed.'
      });
      return;
    }

    if (currentStatus !== 'resolved') {
      res.status(400).json({
        success: false,
        message: `Feedback can only be submitted for resolved grievances. Current status: ${currentStatus}.`
      });
      return;
    }

    // 4. Prevent duplicate feedback: Check if feedback already exists for this grievance by this tourist
    const existingFeedback = await db.collection('feedback')
      .where('grievanceId', '==', grievanceId)
      .where('touristId', '==', uid)
      .limit(1)
      .get();

    if (!existingFeedback.empty) {
      res.status(409).json({
        success: false,
        message: 'You have already submitted feedback for this grievance. Duplicate submissions are not allowed.'
      });
      return;
    }

    // 5. Atomically save feedback AND close the grievance in a single transaction
    const now = new Date().toISOString();
    const feedbackRef = db.collection('feedback').doc();

    const feedbackDoc = {
      id: feedbackRef.id,
      grievanceId,
      touristId: uid,
      touristName: displayName || 'Tourist',
      rating,
      comments: comments || '',
      resolutionSatisfactory: resolutionSatisfactory !== false,
      createdAt: now
    };

    await db.runTransaction(async (transaction) => {
      // Re-read grievance inside transaction for consistency
      const freshGDoc = await transaction.get(gRef);
      if (!freshGDoc.exists) {
        throw { statusCode: 404, message: 'Grievance not found.' };
      }

      const freshData = freshGDoc.data()!;
      if (freshData['status'] === 'closed') {
        throw { statusCode: 409, message: 'Grievance has already been closed.' };
      }
      if (freshData['status'] !== 'resolved') {
        throw { statusCode: 400, message: 'Grievance is no longer in resolved status.' };
      }

      // Create feedback document
      transaction.set(feedbackRef, feedbackDoc);

      // Close the grievance with feedback data
      transaction.update(gRef, {
        status: 'closed',
        rating,
        feedbackComments: comments || '',
        feedbackSubmittedAt: now,
        closedAt: now,
        updatedAt: now
      });
    });

    // 6. Log activity
    const grievanceCode = gData['grievanceCode'] || gData['trackingCode'] || grievanceId;
    logActivity(
      uid,
      displayName || 'Tourist',
      'tourist',
      'SUBMIT_FEEDBACK',
      'Feedback',
      feedbackRef.id,
      `Tourist submitted feedback (${rating}/5 stars) for grievance ${grievanceCode}. Grievance automatically closed.`
    ).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully. Grievance has been closed.',
      feedback: feedbackDoc
    });
  } catch (error: any) {
    if (error?.statusCode && error?.message) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error('Error submitting feedback:', error);
    res.status(500).json({ success: false, message: 'Error submitting feedback.' });
  }
});

export default router;
