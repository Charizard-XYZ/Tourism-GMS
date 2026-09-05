import { Router, Response } from 'express';
import { db } from '../config/firebase-admin';
import { authenticateFirebaseToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/role.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { createDepartmentSchema, updateDepartmentSchema } from '../validators/schemas';

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
    } catch (reconnectErr) {
      console.warn('Notice: error reconnecting pending grievances on department recreation:', reconnectErr);
    }

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

    // 1. Reset assigned officers to Unassigned across both users and officers collections
    const [userOfficersSnap, officerProfilesSnap] = await Promise.all([
      db.collection('users').where('departmentId', '==', id).get(),
      db.collection('officers').where('departmentId', '==', id).get()
    ]);

    const affectedOfficerIds = new Set<string>();
    userOfficersSnap.docs.forEach(d => affectedOfficerIds.add(d.id));
    officerProfilesSnap.docs.forEach(d => affectedOfficerIds.add(d.id));

    for (const offId of affectedOfficerIds) {
      const resetData = {
        departmentId: '',
        departmentName: 'Unassigned',
        updatedAt: new Date().toISOString()
      };
      await Promise.all([
        db.collection('users').doc(offId).set(resetData, { merge: true }),
        db.collection('officers').doc(offId).set(resetData, { merge: true })
      ]);
    }

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

    res.status(200).json({
      success: true,
      message: `Department "${deptName}" deleted. Solved cases preserved; unsolved cases moved to Unassigned Grievance Tickets.`
    });
  } catch (error: any) {
    console.error('Error deleting department:', error);
    res.status(500).json({ success: false, message: 'Error deleting department.' });
  }
});

export default router;
