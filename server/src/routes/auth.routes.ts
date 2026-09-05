import { Router, Response } from 'express';
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

export default router;
