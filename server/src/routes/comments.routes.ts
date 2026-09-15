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
    const rawComments = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    // Filter out internal comments for tourists
    const filtered = rawComments.filter((c: any) => {
      if (req.user!.role === 'tourist' && c.isInternalOnly) return false;
      return true;
    });

    // Cache user profiles to resolve real names and roles for comments
    const userCache = new Map<string, { name: string; role: string }>();

    if (req.user) {
      userCache.set(req.user.uid, {
        name: req.user.displayName || '',
        role: req.user.role
      });
    }

    const comments = await Promise.all(filtered.map(async (c: any) => {
      let userName = (c.userName || '').trim();
      let userRole = (c.userRole || '').trim().toLowerCase();

      const needsName = !userName || userName === 'User' || (userName.length > 25 && !userName.includes(' '));
      const needsRole = !userRole || !['tourist', 'officer', 'admin'].includes(userRole);

      if ((needsName || needsRole) && c.userId) {
        if (!userCache.has(c.userId)) {
          try {
            const userDoc = await db.collection('users').doc(c.userId).get();
            if (userDoc.exists) {
              const uData = userDoc.data() || {};
              userCache.set(c.userId, {
                name: uData['fullName'] || uData['name'] || uData['displayName'] || '',
                role: (uData['role'] || '').toLowerCase()
              });
            } else {
              const uidQuery = await db.collection('users').where('uid', '==', c.userId).limit(1).get();
              if (!uidQuery.empty) {
                const uData = uidQuery.docs[0].data() || {};
                userCache.set(c.userId, {
                  name: uData['fullName'] || uData['name'] || uData['displayName'] || '',
                  role: (uData['role'] || '').toLowerCase()
                });
              }
            }
          } catch (err) {
            console.warn(`Could not resolve user profile for comment userId: ${c.userId}`, err);
          }
        }

        const cached = userCache.get(c.userId);
        if (cached) {
          if (cached.name && needsName) userName = cached.name;
          if (cached.role && needsRole) userRole = cached.role;
        }
      }

      return {
        ...c,
        userName: userName || 'User',
        userRole: userRole || 'tourist'
      };
    }));

    comments.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    res.status(200).json({ success: true, comments });
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

    let authorName = (displayName || '').trim();
    if (!authorName || authorName === 'User') {
      try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
          const u = userDoc.data() || {};
          authorName = u['fullName'] || u['name'] || u['displayName'] || '';
        }
      } catch (e) {
        // Fallback to displayName or email
      }
    }
    if (!authorName && req.user?.email) {
      authorName = req.user.email.split('@')[0];
    }

    const docRef = db.collection('comments').doc();
    const newComment = {
      id: docRef.id,
      grievanceId,
      userId: uid,
      userName: authorName || 'User',
      userRole: role,
      commentText,
      isInternalOnly: role === 'tourist' ? false : (isInternalOnly || false),
      createdAt: new Date().toISOString()
    };

    await docRef.set(newComment);

    res.status(201).json({ success: true, message: 'Comment added', comment: newComment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error adding comment.' });
  }
});

export default router;
