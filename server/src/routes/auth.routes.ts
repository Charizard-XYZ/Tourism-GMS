import { Router, Response } from 'express';
import { db, adminAuth } from '../config/firebase-admin';
import { authenticateFirebaseToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { registerCitizenSchema } from '../validators/schemas';

const router = Router();

/**
 * POST /api/auth/register-citizen
 * Save tourist/citizen profile in users/{uid} after Firebase Auth signup
 */
router.post('/register-citizen', authenticateFirebaseToken, validateBody(registerCitizenSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { uid, email } = req.user!;
    const { fullName, phoneNumber } = req.body;

    const userDocRef = db.collection('users').doc(uid);
    const existingDoc = await userDocRef.get();

    if (existingDoc.exists) {
      const data = existingDoc.data()!;
      res.status(200).json({
        success: true,
        message: 'Citizen profile already exists',
        user: { uid, ...data }
      });
      return;
    }

    const newCitizenProfile = {
      uid,
      fullName,
      email: email.toLowerCase().trim(),
      phoneNumber: phoneNumber || '',
      role: 'citizen',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await userDocRef.set(newCitizenProfile);

    res.status(201).json({
      success: true,
      message: 'Citizen registered successfully',
      user: newCitizenProfile
    });
  } catch (error: any) {
    console.error('Error registering citizen profile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while creating citizen profile'
    });
  }
});

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

export default router;
