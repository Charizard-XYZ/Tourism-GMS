import { Router, Response } from 'express';
import { db, adminAuth } from '../config/firebase-admin';
import { authenticateFirebaseToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/role.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { updateProfileSchema } from '../validators/schemas';
import { generateUniqueUserCode } from '../utils/user-code';

const router = Router();

/**
 * GET /api/users/me
 * Fetch authenticated user profile using req.user populated by auth middleware
 */
router.get('/me', authenticateFirebaseToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    let userCode = user.userCode;

    // Backfill userCode for existing user if missing
    if (!userCode) {
      try {
        userCode = await generateUniqueUserCode(user.role);
        await db.collection('users').doc(user.uid).update({ userCode });
        user.userCode = userCode;
      } catch (backfillErr) {
        console.warn(`[USERS/ME NOTICE] Could not backfill userCode for ${user.uid}:`, backfillErr);
      }
    }

    const responseUser = {
      uid: user.uid,
      userCode: userCode || '',
      fullName: user.displayName || 'User',
      email: user.email,
      role: user.role,
      departmentId: user.departmentId || '',
      departmentName: user.departmentName || '',
      designation: user.designation || '',
      phoneNumber: user.phoneNumber || '',
      isActive: user.isActive !== false,
      createdAt: user.createdAt || ''
    };

    res.status(200).json({ success: true, user: responseUser });
  } catch (error: any) {
    console.error('[USERS/ME ERROR] Error in GET /api/users/me:', error.message || error);
    res.status(500).json({ success: false, message: 'Error retrieving user profile.' });
  }
});

/**
 * PUT /api/users/me
 * Update user profile details (fullName, email, phoneNumber)
 */
router.put('/me', authenticateFirebaseToken, validateBody(updateProfileSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { uid, email: oldEmail } = req.user!;
    const { fullName, email: newEmail, phoneNumber } = req.body;

    const userDocRef = db.collection('users').doc(uid);
    const updateData: Record<string, any> = { updatedAt: new Date().toISOString() };

    if (fullName) updateData['fullName'] = fullName;
    if (phoneNumber) updateData['phoneNumber'] = phoneNumber;

    // Handle Email Change in Firebase Auth & Firestore
    if (newEmail && newEmail.toLowerCase().trim() !== oldEmail.toLowerCase().trim()) {
      const cleanEmail = newEmail.toLowerCase().trim();
      
      // Update email in Firebase Auth
      try {
        await adminAuth.updateUser(uid, { email: cleanEmail });
      } catch (e) {
        console.warn('Firebase Auth update warning:', e);
      }
      updateData['email'] = cleanEmail;
    }

    try {
      await userDocRef.update(updateData);
    } catch (e) {
      console.warn('Firestore user update notice:', e);
    }

    // Synchronize to officers/{uid} if user is an officer
    if (req.user?.role === 'officer') {
      try {
        const officerUpdateData: Record<string, any> = { updatedAt: new Date().toISOString() };
        if (fullName) officerUpdateData['fullName'] = fullName;
        if (phoneNumber) {
          officerUpdateData['phoneNumber'] = phoneNumber;
          officerUpdateData['phone'] = phoneNumber;
        }
        if (updateData['email']) officerUpdateData['email'] = updateData['email'];
        await db.collection('officers').doc(uid).set(officerUpdateData, { merge: true });
      } catch (officerSyncErr) {
        console.warn('Notice: error synchronizing officer profile:', officerSyncErr);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: { uid, fullName: fullName || req.user!.displayName, email: newEmail || oldEmail, phoneNumber, role: req.user!.role }
    });
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ success: false, message: error.message || 'Error updating profile.' });
  }
});

/**
 * GET /api/users
 * Admin list all users (Tourists / Officers)
 */
router.get('/', authenticateFirebaseToken, authorizeRoles('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let users: any[] = [];
    try {
      const snapshot = await db.collection('users').get();
      users = snapshot.docs.map((doc: any) => ({ uid: doc.id, ...doc.data() }));
    } catch (e) {
      console.warn('Firestore users list notice:', e);
    }
    res.status(200).json({ success: true, users });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error retrieving users.' });
  }
});

export default router;
