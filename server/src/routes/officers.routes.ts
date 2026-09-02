import { Router, Response } from 'express';
import { db, adminAuth } from '../config/firebase-admin';
import { authenticateFirebaseToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/role.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { createOfficerSchema, updateOfficerSchema } from '../validators/schemas';

const router = Router();

/**
 * GET /api/officers
 * List all registered officers
 */
router.get('/', authenticateFirebaseToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const snapshot = await db.collection('users').where('role', '==', 'officer').get();
    const officers = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    res.status(200).json({ success: true, officers });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error retrieving officers.' });
  }
});

/**
 * POST /api/officers
 * Create Officer Account in Firebase Auth & Firestore users/{UID} (Admin only)
 */
router.post('/', authenticateFirebaseToken, authorizeRoles('admin'), validateBody(createOfficerSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, email, password, departmentId, departmentName, designation, phone } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    // 1. Create Firebase Authentication User via Admin SDK
    const firebaseAuthUser = await adminAuth.createUser({
      email: cleanEmail,
      password: password,
      displayName: name
    });

    const uid = firebaseAuthUser.uid;

    // 2. Create Officer Document in Firestore: users/{UID}
    const officerProfile = {
      uid,
      fullName: name,
      email: cleanEmail,
      phoneNumber: phone || '',
      role: 'officer',
      departmentId,
      departmentName,
      designation,
      isRevoked: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.collection('users').doc(uid).set(officerProfile);

    // 3. Update assigned officers array in department
    if (departmentId) {
      const deptRef = db.collection('departments').doc(departmentId);
      const deptDoc = await deptRef.get();
      if (deptDoc.exists) {
        const deptData = deptDoc.data() || {};
        const currentOfficers = deptData['assignedOfficers'] || [];
        currentOfficers.push({
          id: uid,
          name,
          email: cleanEmail,
          designation,
          phone: phone || ''
        });
        await deptRef.update({
          assignedOfficers: currentOfficers,
          officerCount: currentOfficers.length
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Officer account created successfully',
      officer: { id: uid, ...officerProfile }
    });
  } catch (error: any) {
    console.error('Error creating officer:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create officer account.'
    });
  }
});

/**
 * PUT /api/officers/:id
 * Update Officer profile details (Admin only)
 */
router.put('/:id', authenticateFirebaseToken, authorizeRoles('admin'), validateBody(updateOfficerSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    const userRef = db.collection('users').doc(id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      res.status(404).json({ success: false, message: 'Officer profile not found.' });
      return;
    }

    const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (req.body.name) updates['fullName'] = req.body.name;
    if (req.body.phone) updates['phoneNumber'] = req.body.phone;
    if (req.body.departmentId) updates['departmentId'] = req.body.departmentId;
    if (req.body.departmentName) updates['departmentName'] = req.body.departmentName;
    if (req.body.designation) updates['designation'] = req.body.designation;
    if (req.body.isRevoked !== undefined) updates['isRevoked'] = req.body.isRevoked;

    await userRef.update(updates);
    const updated = await userRef.get();

    res.status(200).json({ success: true, message: 'Officer updated', officer: { id, ...updated.data() } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error updating officer.' });
  }
});

/**
 * DELETE /api/officers/:id
 * Remove Officer (Admin only)
 */
router.delete('/:id', authenticateFirebaseToken, authorizeRoles('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params['id'] as string;

    // Delete Auth User
    try {
      await adminAuth.deleteUser(id);
    } catch (e) {
      console.warn('Firebase Auth user delete warning:', e);
    }

    // Delete Firestore Profile
    await db.collection('users').doc(id).delete();

    res.status(200).json({ success: true, message: 'Officer account removed successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error deleting officer.' });
  }
});

export default router;
