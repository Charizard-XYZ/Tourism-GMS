import { Router, Response } from 'express';
import { db } from '../config/firebase-admin';
import { authenticateFirebaseToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/role.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { createDepartmentSchema, updateDepartmentSchema, assignMultipleOfficersSchema } from '../validators/schemas';
import { redistributeOfficerGrievances, autoDistributeDepartmentUnassignedGrievances } from '../services/redistribution.service';
import { logActivity } from '../utils/activity-logger';

const router = Router();

/**
 * GET /api/departments
 * Fetch all departments
 */
router.get('/', async (req, res: Response): Promise<void> => {
  try {
    const snapshot = await db.collection('departments').get();
    const departments = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    res.status(200).json({ success: true, departments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error retrieving departments.' });
  }
});

/**
 * POST /api/departments
 * Create new department (Admin only)
 * Enforces uniqueness of name and code, and reconnects any matching unsolved grievances from deleted departments.
 */
router.post('/', authenticateFirebaseToken, authorizeRoles('admin'), validateBody(createDepartmentSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, code, description, contactPhone, contactEmail, isActive } = req.body;

    const cleanName = name.trim().toLowerCase();
    const cleanCode = code.trim().toLowerCase();

    if (cleanName === cleanCode) {
      res.status(400).json({
        success: false,
        message: 'Department Name and Department Code / ID should not be the same.'
      });
      return;
    }

    // Verify global uniqueness of department name and code
    const allDeptsSnap = await db.collection('departments').get();
    const duplicate = allDeptsSnap.docs.find(d => {
      const data = d.data();
      const existingName = (data['name'] || '').trim().toLowerCase();
      const existingCode = (data['code'] || '').trim().toLowerCase();
      return existingName === cleanName || existingCode === cleanCode;
    });

    if (duplicate) {
      res.status(400).json({
        success: false,
        message: `A department with this name or code already exists ("${duplicate.data()['name']}" / "${duplicate.data()['code']}").`
      });
      return;
    }

    const docRef = db.collection('departments').doc();
    const newDept = {
      id: docRef.id,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim(),
      contactPhone: contactPhone.trim(),
      contactEmail: contactEmail.trim().toLowerCase(),
      isActive: isActive !== undefined ? isActive : true,
      officerCount: 0,
      activeComplaintsCount: 0,
      assignedOfficers: [],
      createdAt: new Date().toISOString()
    };

    await docRef.set(newDept);

    // Check if matching unsolved grievances exist from previously deleted department
    try {
      const pendingGrievancesSnap = await db.collection('grievances').where('departmentDeleted', '==', true).get();
      const matchingGrievances = pendingGrievancesSnap.docs.filter(gDoc => {
        const data = gDoc.data();
        const origName = (data['originalDepartmentName'] || data['departmentName'] || data['category'] || '').trim().toLowerCase();
        const origCode = (data['originalDepartmentCode'] || data['departmentCode'] || '').trim().toLowerCase();
        return origName === cleanName || origCode === cleanCode;
      });

      for (const gDoc of matchingGrievances) {
        const gData = gDoc.data();
        // If ticket is unsolved, re-associate with newly created department
        if (!['resolved', 'closed', 'cancelled'].includes(gData['status'])) {
          await gDoc.ref.update({
            departmentId: docRef.id,
            departmentName: newDept.name,
            departmentCode: newDept.code,
            departmentDeleted: false,
            updatedAt: new Date().toISOString()
          });
        }
      }

      // If active officers exist for this department name/id, auto-distribute unassigned tickets
      await autoDistributeDepartmentUnassignedGrievances(docRef.id, newDept.name);
    } catch (reconnectErr) {
      console.warn('Notice: error reconnecting pending grievances on department recreation:', reconnectErr);
    }

    // Record activity log
    logActivity(
      req.user!.uid,
      req.user!.displayName || 'Admin',
      'admin',
      'CREATE_DEPARTMENT',
      'Departments',
      docRef.id,
      `Created department "${newDept.name}" (${newDept.code})`
    ).catch(() => {});

    res.status(201).json({ success: true, message: 'Department created successfully', department: newDept });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error creating department.' });
  }
});

/**
 * PUT /api/departments/:id
 * Update department (Admin only)
 */
router.put('/:id', authenticateFirebaseToken, authorizeRoles('admin'), validateBody(updateDepartmentSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    const docRef = db.collection('departments').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ success: false, message: 'Department not found.' });
      return;
    }

    const { name, code } = req.body;
    const cleanName = name ? name.trim().toLowerCase() : '';
    const cleanCode = code ? code.trim().toLowerCase() : '';

    if (cleanName && cleanCode && cleanName === cleanCode) {
      res.status(400).json({
        success: false,
        message: 'Department Name and Department Code / ID should not be the same.'
      });
      return;
    }

    // Verify uniqueness against other departments
    if (cleanName || cleanCode) {
      const allDeptsSnap = await db.collection('departments').get();
      const duplicate = allDeptsSnap.docs.find(d => {
        if (d.id === id) return false;
        const data = d.data();
        const existingName = (data['name'] || '').trim().toLowerCase();
        const existingCode = (data['code'] || '').trim().toLowerCase();
        return (cleanName && existingName === cleanName) || (cleanCode && existingCode === cleanCode);
      });

      if (duplicate) {
        res.status(400).json({
          success: false,
          message: `Another department already uses this name or code ("${duplicate.data()['name']}" / "${duplicate.data()['code']}").`
        });
        return;
      }
    }

    const updates: Record<string, any> = {
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    if (name) updates['name'] = name.trim();
    if (code) updates['code'] = code.trim().toUpperCase();

    await docRef.update(updates);

    const updatedDoc = await docRef.get();

    // Record activity log
    logActivity(
      req.user!.uid,
      req.user!.displayName || 'Admin',
      'admin',
      'UPDATE_DEPARTMENT',
      'Departments',
      id,
      `Updated department parameters for "${name || id}"`
    ).catch(() => {});

    res.status(200).json({ success: true, message: 'Department updated', department: { id, ...updatedDoc.data() } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error updating department.' });
  }
});

/**
 * DELETE /api/departments/:id
 * Delete department (Admin only)
 * Preserves solved cases. Moves unsolved cases to unassigned under "Action Required".
 * Preserves historical department name and code so relation can be recovered upon recreation.
 */
router.delete('/:id', authenticateFirebaseToken, authorizeRoles('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    const docRef = db.collection('departments').doc(id);
    const deptDoc = await docRef.get();

    if (!deptDoc.exists) {
      res.status(404).json({ success: false, message: 'Department not found.' });
      return;
    }

    const deptData = deptDoc.data()!;
    const deptName = deptData['name'] || 'Deleted Department';
    const deptCode = deptData['code'] || '';

    // 1. Reset assigned officers to Unassigned across existing users and officers documents
    const [userOfficersSnap, officerProfilesSnap] = await Promise.all([
      db.collection('users').where('departmentId', '==', id).get(),
      db.collection('officers').where('departmentId', '==', id).get()
    ]);

    const resetData = {
      departmentId: '',
      departmentName: 'Unassigned',
      updatedAt: new Date().toISOString()
    };

    const updateOps: Promise<any>[] = [];
    userOfficersSnap.docs.forEach(d => {
      updateOps.push(d.ref.update(resetData).catch(() => {}));
    });
    officerProfilesSnap.docs.forEach(d => {
      updateOps.push(d.ref.update(resetData).catch(() => {}));
    });
    await Promise.all(updateOps);

    // 2. Handle grievances linked to this department
    const grievancesSnapshot = await db.collection('grievances').where('departmentId', '==', id).get();
    for (const gDoc of grievancesSnapshot.docs) {
      const gData = gDoc.data();
      const isSolved = ['resolved', 'closed', 'cancelled'].includes(gData['status']);

      if (isSolved) {
        // Solved cases: preserve completely, record metadata
        await gDoc.ref.update({
          originalDepartmentName: deptName,
          originalDepartmentCode: deptCode,
          departmentDeleted: true,
          updatedAt: new Date().toISOString()
        });
      } else {
        // Unsolved cases: move to Action Required (Unassigned), unassign officer, preserve original dept info
        await gDoc.ref.update({
          assignedOfficerId: '',
          assignedOfficerName: '',
          status: 'submitted',
          originalDepartmentName: deptName,
          originalDepartmentCode: deptCode,
          departmentDeleted: true,
          updatedAt: new Date().toISOString()
        });
      }
    }

    // 3. Delete Department Document
    await docRef.delete();

    // Record activity log
    logActivity(
      req.user!.uid,
      req.user!.displayName || 'Admin',
      'admin',
      'DELETE_DEPARTMENT',
      'Departments',
      id,
      `Deleted department "${deptName}" (${deptCode}). Preserved solved cases; open cases moved to unassigned.`
    ).catch(() => {});

    res.status(200).json({
      success: true,
      message: `Department "${deptName}" deleted. Solved cases preserved; unsolved cases moved to Unassigned Grievance Tickets.`
    });
  } catch (error: any) {
    console.error('Error deleting department:', error);
    res.status(500).json({ success: false, message: 'Error deleting department.' });
  }
});

/**
 * POST /api/departments/:id/officers
 * Add / Assign multiple officers to a department at once (Admin only)
 * - Accepts officerIds array
 * - Prevents duplicate assignment of the same officer to the same department
 * - Validates all selected officers
 * - Transfers officers already in other departments (redistributing their old active cases)
 * - Updates assignedOfficers array on both old and new departments
 * - Updates users/{id} and officers/{id} profile documents
 */
router.post('/:id/officers', authenticateFirebaseToken, authorizeRoles('admin'), validateBody(assignMultipleOfficersSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const targetDeptId = req.params['id'] as string;
    const { officerIds } = req.body as { officerIds: string[] };

    // 1. Validate target department
    const targetDeptRef = db.collection('departments').doc(targetDeptId);
    const targetDeptDoc = await targetDeptRef.get();
    if (!targetDeptDoc.exists) {
      res.status(404).json({ success: false, message: 'Target department not found.' });
      return;
    }

    const targetDeptData = targetDeptDoc.data()!;
    const targetDeptName = targetDeptData['name'] || 'Department';
    let targetOfficers: any[] = targetDeptData['assignedOfficers'] || [];

    // Deduplicate input officerIds
    const uniqueInputIds = Array.from(new Set(officerIds));

    // 2. Validate all selected officers exist
    const validatedOfficers: Array<{
      id: string;
      fullName: string;
      email: string;
      designation: string;
      phone: string;
      oldDeptId: string;
      oldDeptName: string;
    }> = [];

    for (const officerId of uniqueInputIds) {
      const [officerDoc, userDoc] = await Promise.all([
        db.collection('officers').doc(officerId).get(),
        db.collection('users').doc(officerId).get()
      ]);

      if (!officerDoc.exists && !userDoc.exists) {
        res.status(400).json({
          success: false,
          message: `Officer with ID "${officerId}" does not exist.`
        });
        return;
      }

      const oData = (officerDoc.exists ? officerDoc.data() : userDoc.data()) || {};
      if (oData['isRevoked']) {
        res.status(400).json({
          success: false,
          message: `Officer "${oData['fullName'] || officerId}" is revoked and cannot be assigned.`
        });
        return;
      }

      const email = (oData['email'] || '').toLowerCase().trim();
      const existingInTarget = targetOfficers.some((to: any) =>
        to.id === officerId || (email && to.email && to.email.toLowerCase() === email)
      );

      if (existingInTarget) {
        // Skip duplicate assignment to the same department
        continue;
      }

      let oldDeptId = oData['departmentId'] || '';
      let oldDeptName = oData['departmentName'] || '';

      if (!oldDeptId || oldDeptId === 'Unassigned') {
        const allDeptsSnap = await db.collection('departments').get();
        const foundDept = allDeptsSnap.docs.find(d => {
          const dData = d.data();
          return (dData['assignedOfficers'] || []).some((o: any) =>
            o.id === officerId || (email && o.email && o.email.toLowerCase() === email)
          );
        });
        if (foundDept) {
          oldDeptId = foundDept.id;
          oldDeptName = foundDept.data()['name'] || '';
        }
      }

      validatedOfficers.push({
        id: officerId,
        fullName: oData['fullName'] || oData['displayName'] || oData['name'] || 'Officer',
        email: email,
        designation: oData['designation'] || 'Officer',
        phone: oData['phone'] || oData['phoneNumber'] || '',
        oldDeptId: oldDeptId,
        oldDeptName: oldDeptName
      });
    }

    if (validatedOfficers.length === 0) {
      res.status(200).json({
        success: true,
        message: 'All selected officers are already assigned to this department.',
        assignedOfficers: targetOfficers
      });
      return;
    }

    const now = new Date().toISOString();

    // 3. Process each officer assignment
    for (const officer of validatedOfficers) {
      // If transferring from another department, remove from old department and redistribute cases
      if (officer.oldDeptId && officer.oldDeptId !== targetDeptId) {
        const oldDeptRef = db.collection('departments').doc(officer.oldDeptId);
        const oldDeptDoc = await oldDeptRef.get();
        if (oldDeptDoc.exists) {
          const oldOfficers: any[] = (oldDeptDoc.data()?.['assignedOfficers'] || []).filter(
            (o: any) => o.id !== officer.id && (!officer.email || o.email?.toLowerCase() !== officer.email)
          );
          await oldDeptRef.update({
            assignedOfficers: oldOfficers,
            officerCount: oldOfficers.length,
            updatedAt: now
          });
        }

        // Redistribute officer's active cases in oldDeptId
        await redistributeOfficerGrievances(officer.id, officer.email, officer.oldDeptId, officer.oldDeptName);
      }

      // Update officer's users/{id} and officers/{id} records
      const syncUpdate = {
        departmentId: targetDeptId,
        departmentName: targetDeptName,
        updatedAt: now
      };

      await Promise.all([
        db.collection('users').doc(officer.id).set(syncUpdate, { merge: true }).catch(() => {}),
        db.collection('officers').doc(officer.id).set(syncUpdate, { merge: true }).catch(() => {})
      ]);

      // Append to target department's assignedOfficers
      targetOfficers.push({
        id: officer.id,
        name: officer.fullName,
        email: officer.email,
        designation: officer.designation,
        phone: officer.phone
      });
    }

    // 4. Update target department
    await targetDeptRef.update({
      assignedOfficers: targetOfficers,
      officerCount: targetOfficers.length,
      updatedAt: now
    });

    // 5. Automatically distribute any pending unassigned grievances for this department
    await autoDistributeDepartmentUnassignedGrievances(targetDeptId, targetDeptName);

    // Record activity log
    logActivity(
      req.user!.uid,
      req.user!.displayName || 'Admin',
      'admin',
      'ASSIGN_OFFICERS',
      'Departments',
      targetDeptId,
      `Assigned ${validatedOfficers.length} officer(s) to department "${targetDeptName}"`
    ).catch(() => {});

    res.status(200).json({
      success: true,
      message: `Successfully assigned ${validatedOfficers.length} officer(s) to ${targetDeptName}.`,
      assignedOfficers: targetOfficers
    });
  } catch (error: any) {
    console.error('Error assigning multiple officers to department:', error);
    res.status(500).json({ success: false, message: 'Failed to assign officers to department.' });
  }
});

/**
 * DELETE /api/departments/:id/officers/:officerId
 * Remove Officer From a Department (Admin only)
 * - Removes officer from department's assignedOfficers array
 * - Updates officer's users and officers records to Unassigned
 * - Redistributes officer's active cases in that department among remaining active officers
 */
router.delete('/:id/officers/:officerId', authenticateFirebaseToken, authorizeRoles('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const deptId = req.params['id'] as string;
    const officerId = req.params['officerId'] as string;

    const deptRef = db.collection('departments').doc(deptId);
    const deptDoc = await deptRef.get();
    if (!deptDoc.exists) {
      res.status(404).json({ success: false, message: 'Department not found.' });
      return;
    }

    const deptData = deptDoc.data()!;
    const currentOfficers: any[] = deptData['assignedOfficers'] || [];

    // Find officer profile to get email
    const [officerDoc, userDoc] = await Promise.all([
      db.collection('officers').doc(officerId).get(),
      db.collection('users').doc(officerId).get()
    ]);

    const oData = (officerDoc.exists ? officerDoc.data() : userDoc.data()) || {};
    const officerEmail = (oData['email'] || '').toLowerCase().trim();
    const officerName = oData['fullName'] || oData['displayName'] || oData['name'] || 'Officer';

    // 1. Remove from department assignedOfficers
    const remaining = currentOfficers.filter(
      (o: any) => o.id !== officerId && (!officerEmail || o.email?.toLowerCase() !== officerEmail)
    );

    const now = new Date().toISOString();
    await deptRef.update({
      assignedOfficers: remaining,
      officerCount: remaining.length,
      updatedAt: now
    });

    // 2. Set officer to Unassigned in users/{id} and officers/{id}
    const unassignUpdate = {
      departmentId: '',
      departmentName: 'Unassigned',
      updatedAt: now
    };

    await Promise.all([
      db.collection('users').doc(officerId).set(unassignUpdate, { merge: true }).catch(() => {}),
      db.collection('officers').doc(officerId).set(unassignUpdate, { merge: true }).catch(() => {})
    ]);

    // 3. Redistribute active grievances of this officer in this department
    const redistResult = await redistributeOfficerGrievances(officerId, officerEmail, deptId, deptData['name']);

    // Record activity log
    logActivity(
      req.user!.uid,
      req.user!.displayName || 'Admin',
      'admin',
      'REMOVE_OFFICER_DEPT',
      'Departments',
      deptId,
      `Removed officer "${officerName}" from department "${deptData['name']}". Redistributed ${redistResult.redistributedCount} cases; ${redistResult.unassignedCount} moved to unassigned.`
    ).catch(() => {});

    res.status(200).json({
      success: true,
      message: `Officer "${officerName}" removed from ${deptData['name']}.`,
      redistribution: redistResult
    });
  } catch (error: any) {
    console.error('Error removing officer from department:', error);
    res.status(500).json({ success: false, message: 'Failed to remove officer from department.' });
  }
});

export default router;

