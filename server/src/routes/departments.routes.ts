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

    const docRef = db.collection('departments').doc();
    const newDept = {
      id: docRef.id,
      name,
      code,
      description,
      contactPhone,
      contactEmail,
      isActive: isActive !== undefined ? isActive : true,
      officerCount: 0,
      activeComplaintsCount: 0,
      assignedOfficers: [],
      createdAt: new Date().toISOString()
    };

    await docRef.set(newDept);

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

    await docRef.update({
      ...req.body,
      updatedAt: new Date().toISOString()
    });

    const updatedDoc = await docRef.get();
    res.status(200).json({ success: true, message: 'Department updated', department: { id, ...updatedDoc.data() } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error updating department.' });
  }
});

/**
 * DELETE /api/departments/:id
 * Delete department (Admin only)
 */
router.delete('/:id', authenticateFirebaseToken, authorizeRoles('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    const docRef = db.collection('departments').doc(id);
    await docRef.delete();
    res.status(200).json({ success: true, message: 'Department deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error deleting department.' });
  }
});

export default router;
