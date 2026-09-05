import { Router, Response } from 'express';
import { db, adminAuth } from '../config/firebase-admin';
import { authenticateFirebaseToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/role.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { createOfficerSchema, updateOfficerSchema } from '../validators/schemas';
import { generateUniqueUserCode } from '../utils/user-code';

const router = Router();

/**
 * GET /api/officers
 * List all registered officers from the 'officers' collection.
 * Seamlessly backfills any officer from 'users' not yet in 'officers' to preserve existing data.
 */
router.get('/', authenticateFirebaseToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const snapshot = await db.collection('officers').get();
    let officers = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    // Non-destructive compatibility: backfill any officers stored only in 'users'
    const usersSnapshot = await db.collection('users').where('role', '==', 'officer').get();
    const existingIds = new Set(officers.map((o: any) => o.id || o.uid));

    for (const uDoc of usersSnapshot.docs) {
      if (!existingIds.has(uDoc.id)) {
        const uData = uDoc.data();
        const code = uData['userCode'] || uData['officerCode'] || '';
        const backfilledProfile = {
          uid: uDoc.id,
          userCode: code,
          officerCode: code,
          fullName: uData['fullName'] || uData['displayName'] || 'Officer',
          email: uData['email'] || '',
          phone: uData['phoneNumber'] || uData['phone'] || '',
          phoneNumber: uData['phoneNumber'] || uData['phone'] || '',
          designation: uData['designation'] || 'Officer',
          departmentId: uData['departmentId'] || '',
          departmentName: uData['departmentName'] || 'Unassigned',
          isActive: uData['isActive'] !== false,
          isRevoked: uData['isRevoked'] === true,
          createdAt: uData['createdAt'] || new Date().toISOString(),
          updatedAt: uData['updatedAt'] || new Date().toISOString()
        };
        await db.collection('officers').doc(uDoc.id).set(backfilledProfile);
        officers.push({ id: uDoc.id, ...backfilledProfile });
        existingIds.add(uDoc.id);
      }
    }

    res.status(200).json({ success: true, officers });
  } catch (error: any) {
    console.error('Error retrieving officers:', error);
    res.status(500).json({ success: false, message: 'Error retrieving officers.' });
  }
});

/**
 * POST /api/officers
 * Create Officer Account in:
 * 1. Firebase Authentication
 * 2. Firestore users/{uid} (auth/authorization identity)
 * 3. Firestore officers/{uid} (complete officer profile)
 * Rolls back on failure.
 */
router.post('/', authenticateFirebaseToken, authorizeRoles('admin'), validateBody(createOfficerSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  let createdAuthUid: string | null = null;
  let createdUserDoc = false;

  try {
    const { name, email, password, departmentId, departmentName, designation, phone } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    // Verify email uniqueness against users and officers collections
    const [userSnap, officerSnap] = await Promise.all([
      db.collection('users').where('email', '==', cleanEmail).get(),
      db.collection('officers').where('email', '==', cleanEmail).get()
    ]);

    if (!userSnap.empty || !officerSnap.empty) {
      res.status(400).json({
        success: false,
        message: 'This email already exists.'
      });
      return;
    }

    // 1. Create Firebase Authentication User via Admin SDK
    let firebaseAuthUser;
    try {
      firebaseAuthUser = await adminAuth.createUser({
        email: cleanEmail,
        password: password,
        displayName: name
      });
    } catch (authError: any) {
      if (authError.code === 'auth/email-already-exists' || authError.message?.includes('already exists')) {
        res.status(400).json({ success: false, message: 'This email already exists.' });
        return;
      }
      throw authError;
    }

    const uid = firebaseAuthUser.uid;
    createdAuthUid = uid;

    const userCode = await generateUniqueUserCode('officer');
    const isAssigned = !!departmentId && departmentId.trim() !== '' && departmentName !== 'Unassigned';
    const now = new Date().toISOString();

    // 2. Create users/{uid} with authentication/authorization information
    const userAuthRecord = {
      uid,
      userCode,
      fullName: name,
      email: cleanEmail,
      role: 'officer',
      departmentId: isAssigned ? departmentId : '',
      departmentName: isAssigned ? departmentName : 'Unassigned',
      designation: designation || 'Officer',
      phoneNumber: phone || '',
      isActive: true,
      isRevoked: false,
      createdAt: now,
      updatedAt: now
    };

    await db.collection('users').doc(uid).set(userAuthRecord);
    createdUserDoc = true;

    // 3. Create officers/{uid} with complete Officer profile
    const officerProfile = {
      uid,
      userCode,
      officerCode: userCode,
      fullName: name,
      email: cleanEmail,
      phone: phone || '',
      phoneNumber: phone || '',
      role: 'officer',
      departmentId: isAssigned ? departmentId : '',
      departmentName: isAssigned ? departmentName : 'Unassigned',
      designation: designation || 'Officer',
      isActive: true,
      isRevoked: false,
      createdAt: now,
      updatedAt: now
    };

    try {
      await db.collection('officers').doc(uid).set(officerProfile);
    } catch (officerWriteError) {
      console.error('Failed to create officers document, initiating rollback:', officerWriteError);
      // Safe rollback
      await db.collection('users').doc(uid).delete().catch(() => {});
      await adminAuth.deleteUser(uid).catch(() => {});
      res.status(500).json({
        success: false,
        message: 'Failed to write officer profile. Registration rolled back.'
      });
      return;
    }

    // 4. Update assigned officers array in department if assigned
    if (isAssigned) {
      const deptRef = db.collection('departments').doc(departmentId);
      const deptDoc = await deptRef.get();
      if (deptDoc.exists) {
        const deptData = deptDoc.data() || {};
        const currentOfficers: any[] = (deptData['assignedOfficers'] || []).filter((o: any) => o.id !== uid && o.email !== cleanEmail);
        currentOfficers.push({
          id: uid,
          name,
          email: cleanEmail,
          designation: designation || 'Officer',
          phone: phone || ''
        });
        await deptRef.update({
          assignedOfficers: currentOfficers,
          officerCount: currentOfficers.length,
          updatedAt: new Date().toISOString()
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
    // Cleanup if partially created
    if (createdUserDoc && createdAuthUid) {
      await db.collection('users').doc(createdAuthUid).delete().catch(() => {});
    }
    if (createdAuthUid) {
      await adminAuth.deleteUser(createdAuthUid).catch(() => {});
    }

    const msg = error.code === 'auth/email-already-exists' ? 'This email already exists.' : (error.message || 'Failed to create officer account.');
    res.status(400).json({
      success: false,
      message: msg
    });
  }
});

/**
 * PUT /api/officers/:id
 * Update Officer profile details, revocation, case redistribution, and password change (Admin only)
 * Keeps users/{id} and officers/{id} synchronized.
 */
router.put('/:id', authenticateFirebaseToken, authorizeRoles('admin'), validateBody(updateOfficerSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    const userRef = db.collection('users').doc(id);
    const officerRef = db.collection('officers').doc(id);

    const [userDoc, officerDoc] = await Promise.all([userRef.get(), officerRef.get()]);

    if (!userDoc.exists && !officerDoc.exists) {
      res.status(404).json({ success: false, message: 'Officer profile not found.' });
      return;
    }

    const currentData = (officerDoc.exists ? officerDoc.data() : userDoc.data()) || {};
    const oldDeptId = currentData['departmentId'] || '';
    const oldEmail = currentData['email'] || '';
    const officerName = req.body.name || currentData['fullName'] || currentData['displayName'] || 'Officer';
    const officerEmail = (req.body.email || oldEmail).toLowerCase().trim();
    const officerPhone = req.body.phone !== undefined ? req.body.phone : (currentData['phoneNumber'] || currentData['phone'] || '');
    const officerDesignation = req.body.designation || currentData['designation'] || 'Officer';

    const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (req.body.name) updates['fullName'] = req.body.name;
    if (req.body.phone !== undefined) {
      updates['phoneNumber'] = req.body.phone;
      updates['phone'] = req.body.phone;
    }
    if (req.body.designation) updates['designation'] = req.body.designation;
    if (req.body.isActive !== undefined) updates['isActive'] = req.body.isActive;

    // Handle Password Change via Firebase Admin SDK
    if (req.body.password && req.body.password.trim().length >= 6) {
      await adminAuth.updateUser(id, { password: req.body.password.trim() });
    }

    // Handle Revocation and Case Redistribution
    if (req.body.isRevoked === true) {
      // 1. Disable Firebase Auth account so officer cannot log in
      await adminAuth.updateUser(id, { disabled: true });
      updates['isRevoked'] = true;
      updates['departmentId'] = '';
      updates['departmentName'] = 'Unassigned';

      // 2. Remove from department assignedOfficers
      if (oldDeptId) {
        const currentDeptRef = db.collection('departments').doc(oldDeptId);
        const currentDeptDoc = await currentDeptRef.get();
        if (currentDeptDoc.exists) {
          const remaining: any[] = (currentDeptDoc.data()?.['assignedOfficers'] || []).filter(
            (o: any) => o.id !== id && o.email !== oldEmail && o.email !== officerEmail
          );
          await currentDeptRef.update({
            assignedOfficers: remaining,
            officerCount: remaining.length,
            updatedAt: new Date().toISOString()
          });
        }
      }

      // 3. Redistribute unsolved cases (submitted, assigned, in_progress, reopened)
      const officerGrievancesSnap = await db.collection('grievances').where('assignedOfficerId', '==', id).get();
      const unsolvedGrievances = officerGrievancesSnap.docs.filter(gDoc => {
        const s = gDoc.data()['status'];
        return ['submitted', 'assigned', 'in_progress', 'reopened'].includes(s);
      });

      if (unsolvedGrievances.length > 0) {
        let eligibleOfficers: any[] = [];
        if (oldDeptId) {
          // Look up active peers in officers collection
          const peersSnap = await db.collection('officers')
            .where('departmentId', '==', oldDeptId)
            .get();
          eligibleOfficers = peersSnap.docs
            .filter(d => d.id !== id && !d.data()['isRevoked'] && d.data()['isActive'] !== false)
            .map(d => ({ id: d.id, ...d.data() }));

          // Fallback to users collection if officers collection had no peers
          if (eligibleOfficers.length === 0) {
            const userPeersSnap = await db.collection('users')
              .where('departmentId', '==', oldDeptId)
              .where('role', '==', 'officer')
              .get();
            eligibleOfficers = userPeersSnap.docs
              .filter(d => d.id !== id && !d.data()['isRevoked'] && d.data()['isActive'] !== false)
              .map(d => ({ id: d.id, ...d.data() }));
          }
        }

        if (eligibleOfficers.length > 0) {
          // Equally redistribute (round-robin)
          for (let i = 0; i < unsolvedGrievances.length; i++) {
            const assignedPeer = eligibleOfficers[i % eligibleOfficers.length];
            await unsolvedGrievances[i].ref.update({
              assignedOfficerId: assignedPeer.id,
              assignedOfficerName: assignedPeer.fullName || assignedPeer.displayName || 'Officer',
              status: 'assigned',
              updatedAt: new Date().toISOString()
            });
          }
        } else {
          // No eligible active officer in department: move to Unassigned Grievance Tickets
          for (const gDoc of unsolvedGrievances) {
            await gDoc.ref.update({
              assignedOfficerId: '',
              assignedOfficerName: '',
              status: 'submitted',
              updatedAt: new Date().toISOString()
            });
          }
        }
      }
    } else if (req.body.isRevoked === false) {
      // Unrevoke restores login using the same Auth UID/userCode
      await adminAuth.updateUser(id, { disabled: false });
      updates['isRevoked'] = false;
    }

    // Handle department reassignment or unassign (when not revoking)
    if (req.body.isRevoked !== true && req.body.departmentId !== undefined) {
      const newDeptId = (req.body.departmentId || '').trim();
      const newDeptName = newDeptId ? (req.body.departmentName || 'Department') : 'Unassigned';
      updates['departmentId'] = newDeptId;
      updates['departmentName'] = newDeptName;

      // Remove from old department if changed
      if (oldDeptId && oldDeptId !== newDeptId) {
        const oldDeptRef = db.collection('departments').doc(oldDeptId);
        const oldDeptDoc = await oldDeptRef.get();
        if (oldDeptDoc.exists) {
          const oldList: any[] = (oldDeptDoc.data()?.['assignedOfficers'] || []).filter(
            (o: any) => o.id !== id && o.email !== oldEmail && o.email !== officerEmail
          );
          await oldDeptRef.update({
            assignedOfficers: oldList,
            officerCount: oldList.length,
            updatedAt: new Date().toISOString()
          });
        }
      }

      // Add to new department if assigned
      if (newDeptId) {
        const newDeptRef = db.collection('departments').doc(newDeptId);
        const newDeptDoc = await newDeptRef.get();
        if (newDeptDoc.exists) {
          const newList: any[] = (newDeptDoc.data()?.['assignedOfficers'] || []).filter(
            (o: any) => o.id !== id && o.email !== oldEmail && o.email !== officerEmail
          );
          newList.push({
            id,
            name: officerName,
            email: officerEmail,
            designation: officerDesignation,
            phone: officerPhone
          });
          await newDeptRef.update({
            assignedOfficers: newList,
            officerCount: newList.length,
            updatedAt: new Date().toISOString()
          });
        }
      }
    }

    // Synchronize updates across both users/{id} and officers/{id}
    const userUpdates: Record<string, any> = { ...updates };
    const officerUpdates: Record<string, any> = { ...updates };
    if (officerUpdates['phone']) officerUpdates['phoneNumber'] = officerUpdates['phone'];

    await Promise.all([
      userRef.set(userUpdates, { merge: true }),
      officerRef.set(officerUpdates, { merge: true })
    ]);

    const updatedOfficerDoc = await officerRef.get();
    const updatedData = updatedOfficerDoc.exists ? updatedOfficerDoc.data() : (await userRef.get()).data();

    res.status(200).json({ success: true, message: 'Officer updated', officer: { id, ...updatedData } });
  } catch (error: any) {
    console.error('Error updating officer:', error);
    res.status(500).json({ success: false, message: 'Error updating officer.' });
  }
});

/**
 * DELETE /api/officers/:id
 * Remove Officer (Admin only)
 * Solved cases are preserved; unsolved cases redistributed to peers or moved to unassigned tickets.
 * Permanently removes Auth account, users/{id}, and officers/{id}.
 */
router.delete('/:id', authenticateFirebaseToken, authorizeRoles('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    const userRef = db.collection('users').doc(id);
    const officerRef = db.collection('officers').doc(id);

    const [userDoc, officerDoc] = await Promise.all([userRef.get(), officerRef.get()]);

    if (userDoc.exists || officerDoc.exists) {
      const currentData = (officerDoc.exists ? officerDoc.data() : userDoc.data()) || {};
      const deptId = currentData['departmentId'];
      const email = currentData['email'];

      // 1. Remove from department assignedOfficers
      if (deptId) {
        const deptRef = db.collection('departments').doc(deptId);
        const deptDoc = await deptRef.get();
        if (deptDoc.exists) {
          const assignedList: any[] = (deptDoc.data()?.['assignedOfficers'] || []).filter(
            (o: any) => o.id !== id && o.email !== email
          );
          await deptRef.update({
            assignedOfficers: assignedList,
            officerCount: assignedList.length,
            updatedAt: new Date().toISOString()
          });
        }
      }

      // 2. Redistribute unsolved cases before deleting officer
      const officerGrievancesSnap = await db.collection('grievances').where('assignedOfficerId', '==', id).get();
      const unsolvedGrievances = officerGrievancesSnap.docs.filter(gDoc => {
        const s = gDoc.data()['status'];
        return ['submitted', 'assigned', 'in_progress', 'reopened'].includes(s);
      });

      if (unsolvedGrievances.length > 0) {
        let eligibleOfficers: any[] = [];
        if (deptId) {
          const peersSnap = await db.collection('officers')
            .where('departmentId', '==', deptId)
            .get();
          eligibleOfficers = peersSnap.docs
            .filter(d => d.id !== id && !d.data()['isRevoked'] && d.data()['isActive'] !== false)
            .map(d => ({ id: d.id, ...d.data() }));

          if (eligibleOfficers.length === 0) {
            const userPeersSnap = await db.collection('users')
              .where('departmentId', '==', deptId)
              .where('role', '==', 'officer')
              .get();
            eligibleOfficers = userPeersSnap.docs
              .filter(d => d.id !== id && !d.data()['isRevoked'] && d.data()['isActive'] !== false)
              .map(d => ({ id: d.id, ...d.data() }));
          }
        }

        if (eligibleOfficers.length > 0) {
          for (let i = 0; i < unsolvedGrievances.length; i++) {
            const assignedPeer = eligibleOfficers[i % eligibleOfficers.length];
            await unsolvedGrievances[i].ref.update({
              assignedOfficerId: assignedPeer.id,
              assignedOfficerName: assignedPeer.fullName || assignedPeer.displayName || 'Officer',
              status: 'assigned',
              updatedAt: new Date().toISOString()
            });
          }
        } else {
          for (const gDoc of unsolvedGrievances) {
            await gDoc.ref.update({
              assignedOfficerId: '',
              assignedOfficerName: '',
              status: 'submitted',
              updatedAt: new Date().toISOString()
            });
          }
        }
      }
    }

    // 3. Delete Firebase Authentication account
    try {
      await adminAuth.deleteUser(id);
    } catch (authErr) {
      console.warn('Firebase Auth user already deleted or not found:', authErr);
    }

    // 4. Delete Firestore documents from both users and officers collections
    await Promise.all([
      userRef.delete().catch(() => {}),
      officerRef.delete().catch(() => {})
    ]);

    res.status(200).json({ success: true, message: 'Officer removed successfully' });
  } catch (error: any) {
    console.error('Error deleting officer:', error);
    res.status(500).json({ success: false, message: 'Error deleting officer.' });
  }
});

export default router;
