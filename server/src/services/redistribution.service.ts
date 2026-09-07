import { db } from '../config/firebase-admin';
import { EmailService } from './email.service';

export interface RedistributionResult {
  redistributedCount: number;
  unassignedCount: number;
  assignedOfficerIds: string[];
}

/**
 * Redistributes active grievances of an officer who is transferred or removed from a department.
 * Active grievances include statuses: 'submitted', 'assigned', 'in_progress', 'under_review', 'reopened'.
 *
 * Requirements:
 * 1. Grievances under `oldDeptId` are equally distributed (differing by at most 1) among remaining active officers in `oldDeptId`.
 * 2. If no officers remain in `oldDeptId`, cases are safely moved to unassigned (status: 'submitted', assignedOfficerId: '', assignedOfficerName: '').
 *    Never delete, drop, or assign them to the transferred officer's new department.
 * 3. Never transfer old department grievances to another department.
 */
export async function redistributeOfficerGrievances(
  officerId: string,
  officerEmail: string,
  oldDeptId: string,
  oldDeptName?: string
): Promise<RedistributionResult> {
  if (!oldDeptId) {
    return { redistributedCount: 0, unassignedCount: 0, assignedOfficerIds: [] };
  }

  const cleanEmail = (officerEmail || '').toLowerCase().trim();

  // 1. Query grievances assigned to this officer
  // Check assignedOfficerId match (by UID or email)
  const [snapById, snapByEmail] = await Promise.all([
    db.collection('grievances').where('assignedOfficerId', '==', officerId).get(),
    cleanEmail ? db.collection('grievances').where('assignedOfficerId', '==', cleanEmail).get() : Promise.resolve({ docs: [] } as any)
  ]);

  const seenIds = new Set<string>();
  const activeGrievanceDocs: any[] = [];
  const activeStatuses = ['submitted', 'assigned', 'in_progress', 'under_review', 'reopened'];

  const allDocs = [...snapById.docs, ...snapByEmail.docs];
  for (const doc of allDocs) {
    if (seenIds.has(doc.id)) continue;
    seenIds.add(doc.id);

    const data = doc.data();
    // Only grievances belonging to oldDeptId
    const gDeptId = data['departmentId'];
    const gDeptName = data['departmentName'];
    const matchesDept = (gDeptId && gDeptId === oldDeptId) ||
      (!gDeptId && oldDeptName && gDeptName && gDeptName.toLowerCase() === oldDeptName.toLowerCase());

    if (matchesDept && activeStatuses.includes(data['status'])) {
      activeGrievanceDocs.push(doc);
    }
  }

  if (activeGrievanceDocs.length === 0) {
    return { redistributedCount: 0, unassignedCount: 0, assignedOfficerIds: [] };
  }

  // 2. Query remaining active, non-revoked officers in oldDeptId
  const [officersSnap, usersSnap] = await Promise.all([
    db.collection('officers').where('departmentId', '==', oldDeptId).get(),
    db.collection('users').where('departmentId', '==', oldDeptId).where('role', '==', 'officer').get()
  ]);

  const candidateMap = new Map<string, { id: string; name: string; email: string }>();

  officersSnap.docs.forEach((d: any) => {
    const data = d.data();
    if (d.id !== officerId && (!cleanEmail || data['email']?.toLowerCase() !== cleanEmail)) {
      if (!data['isRevoked'] && data['isActive'] !== false) {
        candidateMap.set(d.id, {
          id: d.id,
          name: data['fullName'] || data['name'] || 'Officer',
          email: data['email'] || ''
        });
      }
    }
  });

  usersSnap.docs.forEach((d: any) => {
    const data = d.data();
    if (d.id !== officerId && (!cleanEmail || data['email']?.toLowerCase() !== cleanEmail)) {
      if (!data['isRevoked'] && data['isActive'] !== false && !candidateMap.has(d.id)) {
        candidateMap.set(d.id, {
          id: d.id,
          name: data['fullName'] || data['displayName'] || 'Officer',
          email: data['email'] || ''
        });
      }
    }
  });

  const remainingOfficers = Array.from(candidateMap.values());
  const now = new Date().toISOString();

  // 3. First make affected grievances available for redistribution by unassigning the departing officer
  for (const gDoc of activeGrievanceDocs) {
    await gDoc.ref.update({
      assignedOfficerId: '',
      assignedOfficerName: '',
      status: 'submitted',
      updatedAt: now
    });
  }

  if (remainingOfficers.length > 0) {
    // 4. Equal round-robin redistribution ensures each grievance is assigned to exactly one eligible officer
    const assignedOfficerIds = new Set<string>();
    let redistributedCount = 0;

    for (let i = 0; i < activeGrievanceDocs.length; i++) {
      const gDoc = activeGrievanceDocs[i];
      const targetOfficer = remainingOfficers[i % remainingOfficers.length];
      let assigned = false;
      let gData: any = null;

      await db.runTransaction(async (transaction) => {
        const freshDoc: any = await transaction.get(db.collection('grievances').doc(gDoc.id));
        if (!freshDoc.exists) return;
        gData = freshDoc.data()!;

        // Check if already assigned or cancelled
        if ((gData['assignedOfficerId'] || '').trim() !== '') {
          return;
        }
        if (['resolved', 'closed', 'cancelled'].includes(gData['status'])) {
          return;
        }

        transaction.update(gDoc.ref, {
          assignedOfficerId: targetOfficer.id,
          assignedOfficerName: targetOfficer.name,
          status: 'assigned',
          updatedAt: now
        });
        assigned = true;
      });

      if (assigned) {
        assignedOfficerIds.add(targetOfficer.id);
        redistributedCount++;

        // Send notification email asynchronously
        if (targetOfficer.email) {
          EmailService.sendOfficerAssignmentEmail(
            targetOfficer.email,
            {
              officerName: targetOfficer.name,
              grievanceCode: gData?.['trackingCode'] || gData?.['grievanceCode'] || gDoc.id,
              title: gData?.['title'] || 'Grievance',
              category: gData?.['departmentName'] || gData?.['category'] || oldDeptName || 'Tourism Department',
              assignedAt: now
            }
          ).catch((err: any) => console.warn('Assignment email notification failed:', err));
        }
      }
    }

    return {
      redistributedCount,
      unassignedCount: activeGrievanceDocs.length - redistributedCount,
      assignedOfficerIds: Array.from(assignedOfficerIds)
    };
  } else {
    // 5. No remaining officers: grievances safely remain unassigned
    return {
      redistributedCount: 0,
      unassignedCount: activeGrievanceDocs.length,
      assignedOfficerIds: []
    };
  }
}

/**
 * Automatically detects and distributes unassigned grievances for a department
 * among its active officers, considering their current active workloads.
 *
 * Requirements:
 * - When department exists and has officers:
 *   - Find all unassigned grievances belonging to that department category/name (or departmentId).
 *   - Find all active (non-revoked) officers belonging to that department.
 *   - Include existing officer active grievance workload so new tickets preferentially go to officers
 *     with lower workloads, keeping workloads balanced across officers (difference <= 1).
 *   - Update each grievance with assigned officer, status: 'assigned', updatedAt.
 *   - Send notification emails.
 */
export async function autoDistributeDepartmentUnassignedGrievances(
  deptId: string,
  deptName?: string
): Promise<{ distributedCount: number; assignedOfficers: string[] }> {
  if (!deptId && !deptName) {
    return { distributedCount: 0, assignedOfficers: [] };
  }

  const cleanDeptName = (deptName || '').trim().toLowerCase();

  // 1. Find active non-revoked officers assigned to this department
  const [officersSnap, usersSnap] = await Promise.all([
    deptId ? db.collection('officers').where('departmentId', '==', deptId).get() : Promise.resolve({ docs: [] } as any),
    deptId ? db.collection('users').where('departmentId', '==', deptId).where('role', '==', 'officer').get() : Promise.resolve({ docs: [] } as any)
  ]);

  const officerMap = new Map<string, { id: string; name: string; email: string; currentLoad: number }>();

  officersSnap.docs.forEach((d: any) => {
    const data = d.data();
    if (!data['isRevoked'] && data['isActive'] !== false) {
      officerMap.set(d.id, {
        id: d.id,
        name: data['fullName'] || data['name'] || 'Officer',
        email: data['email'] || '',
        currentLoad: 0
      });
    }
  });

  usersSnap.docs.forEach((d: any) => {
    const data = d.data();
    if (!data['isRevoked'] && data['isActive'] !== false && !officerMap.has(d.id)) {
      officerMap.set(d.id, {
        id: d.id,
        name: data['fullName'] || data['displayName'] || 'Officer',
        email: data['email'] || '',
        currentLoad: 0
      });
    }
  });

  // If no departmentId was provided or zero officers found by deptId, try matching by departmentName
  if (officerMap.size === 0 && cleanDeptName) {
    const [allOfficersSnap, allUsersSnap] = await Promise.all([
      db.collection('officers').get(),
      db.collection('users').where('role', '==', 'officer').get()
    ]);

    allOfficersSnap.docs.forEach((d: any) => {
      const data = d.data();
      const dName = (data['departmentName'] || '').trim().toLowerCase();
      if (dName === cleanDeptName && !data['isRevoked'] && data['isActive'] !== false) {
        officerMap.set(d.id, {
          id: d.id,
          name: data['fullName'] || data['name'] || 'Officer',
          email: data['email'] || '',
          currentLoad: 0
        });
      }
    });

    allUsersSnap.docs.forEach((d: any) => {
      const data = d.data();
      const dName = (data['departmentName'] || '').trim().toLowerCase();
      if (dName === cleanDeptName && !data['isRevoked'] && data['isActive'] !== false && !officerMap.has(d.id)) {
        officerMap.set(d.id, {
          id: d.id,
          name: data['fullName'] || data['displayName'] || 'Officer',
          email: data['email'] || '',
          currentLoad: 0
        });
      }
    });
  }

  const activeOfficers = Array.from(officerMap.values());
  if (activeOfficers.length === 0) {
    return { distributedCount: 0, assignedOfficers: [] };
  }

  // 2. Fetch all grievances for this department to:
  //    a) compute each officer's existing active workload
  //    b) collect currently unassigned grievances
  const activeStatuses = ['submitted', 'assigned', 'in_progress', 'under_review', 'reopened'];
  const allGrievancesSnap = await db.collection('grievances').get();

  const unassignedDocs: any[] = [];
  const officerLoadMap = new Map<string, number>();
  activeOfficers.forEach(o => officerLoadMap.set(o.id, 0));

  allGrievancesSnap.docs.forEach((gDoc: any) => {
    const data = gDoc.data();
    if (data['status'] === 'cancelled' || data['status'] === 'resolved' || data['status'] === 'closed') {
      return;
    }

    const gDeptId = data['departmentId'];
    const gDeptName = (data['departmentName'] || data['category'] || data['originalDepartmentName'] || '').trim().toLowerCase();
    const matchesDept = (deptId && gDeptId === deptId) || (cleanDeptName && gDeptName === cleanDeptName);

    if (!matchesDept) return;

    const assignedOffId = data['assignedOfficerId'];
    const hasActiveAssignment = !!assignedOffId && activeOfficers.some(o => o.id === assignedOffId || (o.email && o.email.toLowerCase() === assignedOffId.toLowerCase()));

    if (hasActiveAssignment && activeStatuses.includes(data['status'])) {
      // Find matching officer and increment load
      const matched = activeOfficers.find(o => o.id === assignedOffId || (o.email && o.email.toLowerCase() === assignedOffId.toLowerCase()));
      if (matched) {
        officerLoadMap.set(matched.id, (officerLoadMap.get(matched.id) || 0) + 1);
      }
    } else if (!assignedOffId || !hasActiveAssignment) {
      // Unassigned active grievance!
      if (activeStatuses.includes(data['status'])) {
        unassignedDocs.push(gDoc);
      }
    }
  });

  if (unassignedDocs.length === 0) {
    return { distributedCount: 0, assignedOfficers: [] };
  }

  // Update currentLoad on officer objects
  activeOfficers.forEach(o => {
    o.currentLoad = officerLoadMap.get(o.id) || 0;
  });

  // 3. Workload-Balanced Distribution:
  // Pick officer with lowest currentLoad for each grievance.
  // In case of equal workloads, alternate/rotate among tied officers.
  const now = new Date().toISOString();
  const assignedOfficerIds = new Set<string>();
  const officerAssignmentCount = new Map<string, number>();
  activeOfficers.forEach(o => officerAssignmentCount.set(o.id, 0));

  const processedGrievanceIds = new Set<string>();
  let actualDistributedCount = 0;

  for (const gDoc of unassignedDocs) {
    // Prevent duplicate assignment of the same grievance in the same batch
    if (processedGrievanceIds.has(gDoc.id)) {
      continue;
    }
    processedGrievanceIds.add(gDoc.id);

    // Find officer with minimum workload, breaking ties by least recently assigned in this batch
    activeOfficers.sort((a, b) => {
      if (a.currentLoad !== b.currentLoad) {
        return a.currentLoad - b.currentLoad;
      }
      return (officerAssignmentCount.get(a.id) || 0) - (officerAssignmentCount.get(b.id) || 0);
    });

    const chosenOfficer = activeOfficers[0];
    let assignedSuccessfully = false;
    let freshGData: any = null;

    const updateData: Record<string, any> = {
      assignedOfficerId: chosenOfficer.id,
      assignedOfficerName: chosenOfficer.name,
      status: 'assigned',
      departmentDeleted: false,
      updatedAt: now
    };

    if (deptId) updateData['departmentId'] = deptId;
    if (deptName) updateData['departmentName'] = deptName;

    // Check latest Firestore state inside a transaction before writing
    await db.runTransaction(async (transaction) => {
      const freshDoc: any = await transaction.get(db.collection('grievances').doc(gDoc.id));
      if (!freshDoc.exists) return;
      freshGData = freshDoc.data()!;

      // Skip if another officer has already received it or if already assigned
      const currentOfficer = (freshGData['assignedOfficerId'] || '').trim();
      if (currentOfficer) {
        return;
      }

      // Skip if grievance is no longer in an active unassigned state
      if (['resolved', 'closed', 'cancelled'].includes(freshGData['status'])) {
        return;
      }

      transaction.update(gDoc.ref, updateData);
      assignedSuccessfully = true;
    });

    // Only commit workload increment and notify if the transaction succeeded
    if (assignedSuccessfully) {
      chosenOfficer.currentLoad += 1;
      officerAssignmentCount.set(chosenOfficer.id, (officerAssignmentCount.get(chosenOfficer.id) || 0) + 1);
      assignedOfficerIds.add(chosenOfficer.id);
      actualDistributedCount++;

      // Send notification email asynchronously
      if (chosenOfficer.email) {
        EmailService.sendOfficerAssignmentEmail(
          chosenOfficer.email,
          {
            officerName: chosenOfficer.name,
            grievanceCode: freshGData?.['trackingCode'] || freshGData?.['grievanceCode'] || gDoc.id,
            title: freshGData?.['title'] || 'Grievance',
            category: deptName || freshGData?.['departmentName'] || freshGData?.['category'] || 'Tourism Department',
            assignedAt: now
          }
        ).catch((err: any) => console.warn('Assignment email notification failed:', err));
      }
    }
  }

  return {
    distributedCount: actualDistributedCount,
    assignedOfficers: Array.from(assignedOfficerIds)
  };
}

