import { Router, Request, Response } from 'express';
import { db, adminAuth } from '../config/firebase-admin';
import { authenticateFirebaseToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { registerTouristSchema } from '../validators/schemas';
import { generateUniqueUserCode } from '../utils/user-code';

const router = Router();

/**
 * Handler to register tourist profile in users/{uid} after Firebase Auth signup
 */
const handleTouristRegistration = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { uid, email } = req.user!;
    const { fullName, phoneNumber } = req.body;

    const userDocRef = db.collection('users').doc(uid);
    const existingDoc = await userDocRef.get();

    if (existingDoc.exists) {
      const data = existingDoc.data()!;
      let userCode = data['userCode'];
      if (!userCode) {
        userCode = await generateUniqueUserCode('tourist');
        await userDocRef.update({ userCode, role: data['role'] || 'tourist' });
      }
      res.status(200).json({
        success: true,
        message: 'Tourist profile already exists',
        user: { uid, ...data, role: data['role'] || 'tourist', userCode }
      });
      return;
    }

    const userCode = await generateUniqueUserCode('tourist');

    const newTouristProfile = {
      uid,
      userCode,
      fullName,
      email: email.toLowerCase().trim(),
      phoneNumber: phoneNumber || '',
      role: 'tourist',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await userDocRef.set(newTouristProfile);

    res.status(201).json({
      success: true,
      message: 'Tourist registered successfully',
      user: newTouristProfile
    });
  } catch (error: any) {
    console.error('Error registering tourist profile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while creating tourist profile'
    });
  }
};

/**
 * POST /api/auth/register-tourist
 */
router.post('/register-tourist', authenticateFirebaseToken, validateBody(registerTouristSchema), handleTouristRegistration);


/**
 * GET /api/auth/me
 * Fetch authenticated user profile
 */
router.get('/me', authenticateFirebaseToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { uid } = req.user!;
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      res.status(404).json({
        success: false,
        message: 'User profile document not found in Firestore.'
      });
      return;
    }

    res.status(200).json({
      success: true,
      user: { uid: userDoc.id, ...userDoc.data() }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch user profile.' });
  }
});

/**
 * POST /api/auth/check-email
 * Verifies whether an email belongs to an existing registered user in Firebase Authentication.
 * Security: Returns only { success: true, registered: boolean } without leaking account details, UID, or role.
 * Does NOT create any Firestore user document.
 */
router.post('/check-email', async (req: Request, res: Response): Promise<void> => {
  try {
    const rawEmail = req.body?.email;
    if (!rawEmail || typeof rawEmail !== 'string') {
      res.status(400).json({
        success: false,
        registered: false,
        message: 'A valid email address string is required.'
      });
      return;
    }

    const cleanEmail = rawEmail.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      res.status(400).json({
        success: false,
        registered: false,
        message: 'Invalid email address format.'
      });
      return;
    }

    try {
      const userRecord = await adminAuth.getUserByEmail(cleanEmail);
      if (userRecord && !userRecord.disabled) {
        res.status(200).json({
          success: true,
          registered: true
        });
        return;
      }

      res.status(200).json({
        success: true,
        registered: false
      });
    } catch (authErr: any) {
      if (authErr.code === 'auth/user-not-found') {
        res.status(200).json({
          success: true,
          registered: false
        });
        return;
      }
      console.warn('[CHECK-EMAIL] adminAuth lookup error:', authErr.code || authErr.message);
      res.status(200).json({
        success: true,
        registered: false
      });
    }
  } catch (error: any) {
    console.error('[CHECK-EMAIL] Unexpected error:', error);
    res.status(500).json({
      success: false,
      registered: false,
      message: 'Failed to verify email address status.'
    });
  }
});

export default router;
