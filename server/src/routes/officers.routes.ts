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

      // Automatically assign pending unassigned grievances for this department
      try {
        await autoAssignUnassignedGrievances(departmentId, departmentName);
      } catch (assignErr) {
        console.warn('Failed to auto-assign grievances for new officer:', assignErr);
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

      // 3. Redistribute active cases to peers in the same department
      await redistributeOfficerActiveGrievances(id, oldDeptId);
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

      // When officer moves to another department or is unassigned:
      // FIRST redistribute their active grievances in the old department to eligible peers in that old department!
      if (oldDeptId && oldDeptId !== newDeptId) {
        await redistributeOfficerActiveGrievances(id, oldDeptId);

        // Remove officer from old department's assignedOfficers array
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

    // If officer is active, not revoked, and assigned to a department, auto-assign any pending grievances of that department
    if (updatedData && updatedData['isRevoked'] !== true && updatedData['isActive'] !== false && updatedData['departmentId']) {
      try {
        await autoAssignUnassignedGrievances(updatedData['departmentId'], updatedData['departmentName']);
      } catch (assignErr) {
        console.warn('Failed to auto-assign grievances after officer update:', assignErr);
      }
    }

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
      await redistributeOfficerActiveGrievances(id, deptId);
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

/**
 * Automatically assign unassigned grievances in a department when an eligible officer becomes available.
 * Workload-balances among all eligible active officers in the department.
 */
export async function autoAssignUnassignedGrievances(targetDeptId: string, targetDeptName?: string): Promise<number> {
  if (!targetDeptId && !targetDeptName) return 0;

  // 1. Get eligible active officers for this department
  const officersSnapshot = await db.collection('officers').get();
  let officers = officersSnapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));

  const usersSnapshot = await db.collection('users').where('role', '==', 'officer').get();
  const existingIds = new Set(officers.map((o: any) => o.id || o.uid));
  for (const uDoc of usersSnapshot.docs) {
    if (!existingIds.has(uDoc.id)) {
      officers.push({ id: uDoc.id, ...uDoc.data() });
    }
  }

  const cleanTargetDeptName = (targetDeptName || '').trim().toLowerCase();
  const eligibleOfficers = officers.filter((o: any) => {
    if (o.isActive === false || o.isRevoked === true) return false;
    const oDeptId = o.departmentId;
    const oDeptName = (o.departmentName || '').trim().toLowerCase();
    return (targetDeptId && oDeptId === targetDeptId) ||
           (cleanTargetDeptName && oDeptName && oDeptName !== 'unassigned' && oDeptName === cleanTargetDeptName);
  });

  if (eligibleOfficers.length === 0) return 0;

  // 2. Fetch all unassigned grievances for this department
  const grievancesSnapshot = await db.collection('grievances').get();
  const unassignedGrievances = grievancesSnapshot.docs.filter((gDoc: any) => {
    const data = gDoc.data();
    if (data['status'] === 'resolved' || data['status'] === 'closed' || data['status'] === 'cancelled') {
      return false;
    }
    const hasOfficer = !!data['assignedOfficerId'] && data['assignedOfficerId'].trim() !== '';
    if (hasOfficer) return false;

    const gDeptId = data['departmentId'];
    const gDeptName = (data['departmentName'] || data['category'] || '').trim().toLowerCase();
    return (targetDeptId && gDeptId === targetDeptId) ||
           (cleanTargetDeptName && gDeptName === cleanTargetDeptName);
  });

  if (unassignedGrievances.length === 0) return 0;

  // 3. Count workload on active officers
  const activeGrievancesSnap = await db.collection('grievances')
    .where('status', 'in', ['submitted', 'assigned', 'in_progress', 'reopened'])
    .get();

  const loadMap = new Map<string, number>();
  for (const off of eligibleOfficers) {
    loadMap.set(off.uid || off.id, 0);
  }
  for (const gDoc of activeGrievancesSnap.docs) {
    const offId = gDoc.data()['assignedOfficerId'];
    if (offId && loadMap.has(offId)) {
      loadMap.set(offId, (loadMap.get(offId) || 0) + 1);
    }
  }

  // 4. Assign each unassigned grievance to the officer with lowest workload
  let assignedCount = 0;
  for (const gDoc of unassignedGrievances) {
    eligibleOfficers.sort((a: any, b: any) => {
      const idA = a.uid || a.id;
      const idB = b.uid || b.id;
      const loadA = loadMap.get(idA) || 0;
      const loadB = loadMap.get(idB) || 0;
      if (loadA !== loadB) return loadA - loadB;
      return (idA || '').localeCompare(idB || '');
    });

    const chosen = eligibleOfficers[0];
    const chosenId = chosen.uid || chosen.id;
    const chosenName = chosen.fullName || chosen.name || chosen.displayName || 'Officer';

    await gDoc.ref.update({
      assignedOfficerId: chosenId,
      assignedOfficerName: chosenName,
      status: 'assigned',
      updatedAt: new Date().toISOString()
    });

    loadMap.set(chosenId, (loadMap.get(chosenId) || 0) + 1);
    assignedCount++;
  }

  return assignedCount;
}

/**
 * Redistributes active grievances currently assigned to an officer in a specific department.
 * Active statuses: 'submitted', 'assigned', 'in_progress', 'reopened'.
 * Resolved and closed cases are NEVER redistributed; their historical resolver info remains intact.
 * Redistributes to eligible active peers in the SAME department using workload balancing.
 * If no eligible peer exists in the department, marks them genuinely unassigned.
 */
export async function redistributeOfficerActiveGrievances(officerId: string, departmentId?: string): Promise<number> {
  const officerGrievancesSnap = await db.collection('grievances').where('assignedOfficerId', '==', officerId).get();

  const activeGrievances = officerGrievancesSnap.docs.filter((gDoc: any) => {
    const data = gDoc.data();
    const status = data['status'];
    const isActive = ['submitted', 'assigned', 'in_progress', 'reopened'].includes(status);
    if (!isActive) return false;
    if (departmentId) {
      return data['departmentId'] === departmentId;
    }
    return true;
  });

  if (activeGrievances.length === 0) return 0;

  // Group grievances by departmentId to redistribute within each grievance's own department
  const deptMap = new Map<string, any[]>();
  for (const gDoc of activeGrievances) {
    const dId = gDoc.data()['departmentId'] || departmentId || '';
    if (!deptMap.has(dId)) deptMap.set(dId, []);
    deptMap.get(dId)!.push(gDoc);
  }

  // Pre-fetch all active officers
  const [officersSnap, usersSnap] = await Promise.all([
    db.collection('officers').get(),
    db.collection('users').where('role', '==', 'officer').get()
  ]);

  let allOfficers = officersSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  const existingIds = new Set(allOfficers.map((o: any) => o.id || o.uid));
  for (const uDoc of usersSnap.docs) {
    if (!existingIds.has(uDoc.id)) {
      allOfficers.push({ id: uDoc.id, ...uDoc.data() });
    }
  }

  // Count active load across all active grievances
  const activeAllSnap = await db.collection('grievances')
    .where('status', 'in', ['submitted', 'assigned', 'in_progress', 'reopened'])
    .get();

  const loadMap = new Map<string, number>();
  for (const off of allOfficers) {
    loadMap.set(off.id || off.uid, 0);
  }
  for (const aDoc of activeAllSnap.docs) {
    const offId = aDoc.data()['assignedOfficerId'];
    if (offId && offId !== officerId && loadMap.has(offId)) {
      loadMap.set(offId, (loadMap.get(offId) || 0) + 1);
    }
  }

  let count = 0;
  for (const [dId, grievances] of deptMap.entries()) {
    // Find eligible peers in this department excluding the officer
    const eligiblePeers = allOfficers.filter((o: any) => {
      const oId = o.id || o.uid;
      if (oId === officerId) return false;
      if (o.isRevoked === true || o.isActive === false) return false;
      return o.departmentId === dId;
    });

    if (eligiblePeers.length > 0) {
      for (const gDoc of grievances) {
        eligiblePeers.sort((a: any, b: any) => {
          const idA = a.id || a.uid;
          const idB = b.id || b.uid;
          const loadA = loadMap.get(idA) || 0;
          const loadB = loadMap.get(idB) || 0;
          if (loadA !== loadB) return loadA - loadB;
          return (idA || '').localeCompare(idB || '');
        });

        const assignedPeer = eligiblePeers[0];
        const assignedPeerId = assignedPeer.id || assignedPeer.uid;
        const assignedPeerName = assignedPeer.fullName || assignedPeer.name || assignedPeer.displayName || 'Officer';

        await gDoc.ref.update({
          assignedOfficerId: assignedPeerId,
          assignedOfficerName: assignedPeerName,
          status: 'assigned',
          updatedAt: new Date().toISOString()
        });

        loadMap.set(assignedPeerId, (loadMap.get(assignedPeerId) || 0) + 1);
        count++;
      }
    } else {
      // No eligible peer in department: mark as genuinely unassigned
      for (const gDoc of grievances) {
        await gDoc.ref.update({
          assignedOfficerId: '',
          assignedOfficerName: '',
          status: 'submitted',
          updatedAt: new Date().toISOString()
        });
        count++;
      }
    }
  }

  return count;
}

/**
 * Detects invalid active grievance assignments:
 * 1. Officer no longer exists.
 * 2. Officer is revoked or inactive.
 * 3. Officer's department does not match the grievance's department.
 * Automatically heals invalid assignments by reassigning to an eligible peer in the grievance's department,
 * or clearing assignment if no eligible peer exists.
 */
export async function sanitizeGrievanceAssignments(): Promise<number> {
  const activeGrievancesSnap = await db.collection('grievances')
    .where('status', 'in', ['submitted', 'assigned', 'in_progress', 'reopened'])
    .get();

  const assignedGrievances = activeGrievancesSnap.docs.filter((d: any) => {
    const data = d.data();
    return !!data['assignedOfficerId'] && data['assignedOfficerId'].trim() !== '';
  });

  if (assignedGrievances.length === 0) return 0;

  const [officersSnap, usersSnap] = await Promise.all([
    db.collection('officers').get(),
    db.collection('users').where('role', '==', 'officer').get()
  ]);

  const officerMap = new Map<string, any>();
  for (const doc of officersSnap.docs) {
    officerMap.set(doc.id, { id: doc.id, ...doc.data() });
  }
  for (const doc of usersSnap.docs) {
    if (!officerMap.has(doc.id)) {
      officerMap.set(doc.id, { id: doc.id, ...doc.data() });
    }
  }

  let healedCount = 0;
  for (const gDoc of assignedGrievances) {
    const gData = gDoc.data();
    const offId = gData['assignedOfficerId'];
    const gDeptId = gData['departmentId'];
    const officer = officerMap.get(offId);

    const isInvalid = !officer ||
      officer.isRevoked === true ||
      officer.isActive === false ||
      (gDeptId && officer.departmentId && officer.departmentId !== gDeptId);

    if (isInvalid) {
      // Find eligible peer in grievance's department
      const eligiblePeers = Array.from(officerMap.values()).filter((o: any) => {
        const oId = o.id || o.uid;
        if (oId === offId) return false;
        if (o.isRevoked === true || o.isActive === false) return false;
        return o.departmentId === gDeptId;
      });

      if (eligiblePeers.length > 0) {
        const chosen = eligiblePeers[0];
        const chosenId = chosen.id || chosen.uid;
        const chosenName = chosen.fullName || chosen.name || chosen.displayName || 'Officer';
        await gDoc.ref.update({
          assignedOfficerId: chosenId,
          assignedOfficerName: chosenName,
          status: 'assigned',
          updatedAt: new Date().toISOString()
        });
      } else {
        await gDoc.ref.update({
          assignedOfficerId: '',
          assignedOfficerName: '',
          status: 'submitted',
          updatedAt: new Date().toISOString()
        });
      }
      healedCount++;
    }
  }

  return healedCount;
}

export default router;
