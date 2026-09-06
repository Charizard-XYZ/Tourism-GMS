import { Router, Response } from 'express';
import { db } from '../config/firebase-admin';
import { authenticateFirebaseToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { createCommentSchema } from '../validators/schemas';

const router = Router();

/**
 * GET /api/comments?grievanceId=...
 */
router.get('/', authenticateFirebaseToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const grievanceId = req.query['grievanceId'] as string;
    let query: any = db.collection('comments');

    if (grievanceId) {
      query = query.where('grievanceId', '==', grievanceId);
    }

    const snapshot = await query.get();
    const comments = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    // Filter out internal comments for tourists
    const filtered = comments.filter((c: any) => {
      if (req.user!.role === 'tourist' && c.isInternalOnly) return false;
      return true;
    });

    filtered.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    res.status(200).json({ success: true, comments: filtered });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error retrieving comments.' });
  }
});

/**
 * POST /api/comments
 */
router.post('/', authenticateFirebaseToken, validateBody(createCommentSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { uid, role, displayName, email } = req.user!;
    const { grievanceId, commentText, isInternalOnly } = req.body;

    const gRef = db.collection('grievances').doc(grievanceId);
    const gDoc = await gRef.get();

    if (!gDoc.exists) {
      res.status(404).json({ success: false, message: 'Grievance not found.' });
      return;
    }

    const gData = gDoc.data()!;

    // Authorization: Tourist can comment on own grievances; Officer can comment on assigned; Admin can comment on all
    if (role === 'tourist') {
      if (gData['touristId'] !== uid && gData['touristEmail'] !== email) {
        res.status(403).json({ success: false, message: 'Forbidden: You can only comment on your own grievances.' });
        return;
      }
    } else if (role === 'officer') {
      if (gData['assignedOfficerId'] !== uid && req.user?.['isRevoked'] === true) {
        res.status(403).json({ success: false, message: 'Forbidden: Revoked officers cannot post comments.' });
        return;
      }
    }

    const grievanceCode = gData['grievanceCode'] || gData['trackingCode'] || '';
    const docRef = db.collection('comments').doc();
    const newComment = {
      id: docRef.id,
      commentId: docRef.id,
      grievanceId,
      grievanceCode,
      userId: uid,
      userName: displayName || (role === 'tourist' ? 'Tourist' : 'Officer'),
      userRole: role,
      commentText,
      comment: commentText, // alias
      isInternalOnly: role === 'tourist' ? false : (isInternalOnly || false),
      createdAt: new Date().toISOString()
    };

    await docRef.set(newComment);

    res.status(201).json({ success: true, message: 'Comment added', comment: newComment });
  } catch (error: any) {
    console.error('Error adding comment:', error);
    res.status(500).json({ success: false, message: 'Error adding comment.' });
  }
});

export default router;
