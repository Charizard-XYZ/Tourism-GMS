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

    // Filter out internal comments for citizens
    const filtered = comments.filter((c: any) => {
      if (req.user!.role === 'citizen' && c.isInternalOnly) return false;
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
    const { uid, role, displayName } = req.user!;
    const { grievanceId, commentText, isInternalOnly } = req.body;

    const docRef = db.collection('comments').doc();
    const newComment = {
      id: docRef.id,
      grievanceId,
      userId: uid,
      userName: displayName || 'User',
      userRole: role,
      commentText,
      isInternalOnly: role === 'citizen' ? false : (isInternalOnly || false),
      createdAt: new Date().toISOString()
    };

    await docRef.set(newComment);

    res.status(201).json({ success: true, message: 'Comment added', comment: newComment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error adding comment.' });
  }
});

export default router;
