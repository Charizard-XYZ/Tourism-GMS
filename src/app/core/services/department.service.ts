import { Injectable, signal, inject } from '@angular/core';
import { Department, DepartmentOfficer } from '../models/department.model';
import { AuditLogService } from './audit-log.service';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: 'root'
})
export class DepartmentService {
  private auditLogService = inject(AuditLogService);
  private authService = inject(AuthService);
  private firebaseService = inject(FirebaseService);

  private initialDepartments: Department[] = [
    {
      id: 'dept-01',
      name: 'Transport & Mobility Cell',
      code: 'TS-CELL',
      description: 'Taxi fare regulation, permit compliance, prepaid booth oversight, and driver conduct.',
      contactPhone: '+91 177 2654321',
      contactEmail: 'transport.gms@hp.gov.in',
      isActive: true,
      officerCount: 1,
      activeComplaintsCount: 1,
      assignedOfficers: [
        {
          id: 'OFF-847291',
          name: 'Ramesh Chand',
          email: 'ramesh.chand@hp.gov.in',
          designation: 'Senior Transport Inspector',
          phone: '+91 98160 12345'
        }
      ],
      createdAt: new Date().toISOString()
    },
    {
      id: 'dept-02',
      name: 'Hospitality & Hotel Standards',
      code: 'HT-STD',
      description: 'Hotel tariff transparency, hygiene compliance, booking refunds, and hospitality dispute redressal.',
      contactPhone: '+91 177 2654322',
      contactEmail: 'hospitality.gms@hp.gov.in',
      isActive: true,
      officerCount: 1,
      activeComplaintsCount: 1,
      assignedOfficers: [
        {
          id: 'OFF-912834',
          name: 'Sunil Kumar',
          email: 'sunil.kumar@hp.gov.in',
          designation: 'Hospitality Nodal Inspector',
          phone: '+91 98160 67890'
        }
      ],
      createdAt: new Date().toISOString()
    }
  ];

  readonly departments = signal<Department[]>(this.initialDepartments);

  constructor() {
    this.restoreFromStorage();
    this.syncFromBackend();
  }

  private restoreFromStorage(): void {
    try {
      const savedDepts = localStorage.getItem('gms_departments');
      if (savedDepts) {
        this.departments.set(JSON.parse(savedDepts));
      }
    } catch (err) {
      console.warn('Failed to restore departments from localStorage:', err);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('gms_departments', JSON.stringify(this.departments()));
    } catch (err) {
      console.warn('Failed to save departments to localStorage:', err);
    }
  }

  async syncFromBackend() {
    const remote = await this.firebaseService.fetchApi<Department[]>('/departments');
    if (remote && Array.isArray(remote)) {
      this.departments.set(remote);
      this.saveToStorage();
    }
  }

  /**
   * Only Administrator can create departments
   */
  createDepartment(dept: Omit<Department, 'id' | 'createdAt' | 'officerCount' | 'activeComplaintsCount'>): Department {
    if (!this.authService.isAdmin()) {
      throw new Error('Unauthorized: Only Administrators can create departments.');
    }

    const assignedOfficers = dept.assignedOfficers || [];
    const newDept: Department = {
      ...dept,
      id: `dept-${Date.now().toString().slice(-4)}`,
      assignedOfficers,
      officerCount: assignedOfficers.length,
      activeComplaintsCount: 0,
      createdAt: new Date().toISOString()
    };

    this.departments.update(list => [...list, newDept]);

    const currentUser = this.authService.currentUser();
    if (currentUser) {
      this.auditLogService.log(
        currentUser.uid,
        currentUser.displayName,
        currentUser.role,
        'CREATE_DEPARTMENT',
        'Departments',
        newDept.id,
        `Created department: ${newDept.name} (${newDept.code}) with ${assignedOfficers.length} officers`
      );
    }

    return newDept;
  }

  /**
   * Only Administrator can update departments
   */
  updateDepartment(id: string, updates: Partial<Department>): void {
    if (!this.authService.isAdmin()) {
      throw new Error('Unauthorized: Only Administrators can edit departments.');
    }

    this.departments.update(list =>
      list.map(d => {
        if (d.id === id) {
          const updatedOfficers = updates.assignedOfficers || d.assignedOfficers || [];
          return {
            ...d,
            ...updates,
            assignedOfficers: updatedOfficers,
            officerCount: updatedOfficers.length
          };
        }
        return d;
      })
    );

    const currentUser = this.authService.currentUser();
    if (currentUser) {
      this.auditLogService.log(
        currentUser.uid,
        currentUser.displayName,
        currentUser.role,
        'UPDATE_DEPARTMENT',
        'Departments',
        id,
        `Updated department parameters for ID ${id}`
      );
    }
  }

  /**
   * Add Officer to a Department
   */
  addOfficerToDepartment(departmentId: string, officer: Omit<DepartmentOfficer, 'id'>): void {
    if (!this.authService.isAdmin()) {
      throw new Error('Unauthorized: Only Administrators can modify department officers.');
    }

    const dept = this.departments().find(d => d.id === departmentId);
    const deptName = dept ? dept.name : 'Unassigned';
    const cleanEmail = officer.email.toLowerCase().trim();

    const newOfficer: DepartmentOfficer = {
      ...officer,
      email: cleanEmail,
      id: `off-${Date.now().toString().slice(-4)}`
    };

    // Remove officer from ALL departments first to guarantee strict 1-department-per-officer assignment
    this.departments.update(list =>
      list.map(d => {
        const currentOfficers = d.assignedOfficers || [];
        const filteredOfficers = currentOfficers.filter(o => o.email.toLowerCase().trim() !== cleanEmail);
        return {
          ...d,
          assignedOfficers: filteredOfficers,
          officerCount: filteredOfficers.length
        };
      })
    );

    // Add officer exclusively to the single target department
    this.departments.update(list =>
      list.map(d => {
        if (d.id === departmentId) {
          const currentOfficers = d.assignedOfficers || [];
          const updatedOfficers = [...currentOfficers, newOfficer];
          return {
            ...d,
            assignedOfficers: updatedOfficers,
            officerCount: updatedOfficers.length
          };
        }
        return d;
      })
    );

    // Link officer in AuthService registeredOfficers roster
    this.authService.linkOfficerToDepartment(cleanEmail, departmentId, deptName);

    const currentUser = this.authService.currentUser();
    if (currentUser) {
      this.auditLogService.log(
        currentUser.uid,
        currentUser.displayName,
        currentUser.role,
        'ADD_OFFICER',
        'Departments',
        departmentId,
        `Assigned officer ${newOfficer.name} (${cleanEmail}) exclusively to department ${deptName}`
      );
    }
  }

  /**
   * Remove officer from ALL departments (e.g. when officer is revoked)
   */
  removeOfficerFromAllDepartments(officerIdOrEmail: string): void {
    const cleanStr = officerIdOrEmail.toLowerCase().trim();
    this.departments.update(list =>
      list.map(d => {
        const currentOfficers = d.assignedOfficers || [];
        const updatedOfficers = currentOfficers.filter(o => 
          o.id.toLowerCase().trim() !== cleanStr && o.email.toLowerCase().trim() !== cleanStr
        );
        return {
          ...d,
          assignedOfficers: updatedOfficers,
          officerCount: updatedOfficers.length
        };
      })
    );
  }

  /**
   * Remove Officer from a Department
   */
  removeOfficerFromDepartment(departmentId: string, officerId: string): void {
    if (!this.authService.isAdmin()) {
      throw new Error('Unauthorized: Only Administrators can remove department officers.');
    }

    const dept = this.departments().find(d => d.id === departmentId);
    const targetOfficer = dept?.assignedOfficers?.find(o => o.id === officerId);

    this.departments.update(list =>
      list.map(d => {
        if (d.id === departmentId) {
          const currentOfficers = d.assignedOfficers || [];
          const updatedOfficers = currentOfficers.filter(o => o.id !== officerId && o.email !== targetOfficer?.email);
          return {
            ...d,
            assignedOfficers: updatedOfficers,
            officerCount: updatedOfficers.length
          };
        }
        return d;
      })
    );

    // Unlink officer in AuthService registeredOfficers roster
    this.authService.unlinkOfficerFromDepartment(officerId);
    if (targetOfficer?.email) {
      this.authService.unlinkOfficerFromDepartment(targetOfficer.email);
    }

    const currentUser = this.authService.currentUser();
    if (currentUser) {
      this.auditLogService.log(
        currentUser.uid,
        currentUser.displayName,
        currentUser.role,
        'REMOVE_OFFICER',
        'Departments',
        departmentId,
        `Removed officer ID ${officerId} from department ${departmentId}`
      );
    }
  }

  /**
   * Only Administrator can permanently delete a department
   */
  deleteDepartment(id: string): void {
    if (!this.authService.isAdmin()) {
      throw new Error('Unauthorized: Only Administrators can delete departments.');
    }

    const dept = this.departments().find(d => d.id === id);

    this.departments.update(list => list.filter(d => d.id !== id));

    // Clear department assignment for all registered officers belonging to deleted department
    this.authService.clearDepartmentFromOfficers(id);

    const currentUser = this.authService.currentUser();
    if (currentUser && dept) {
      this.auditLogService.log(
        currentUser.uid,
        currentUser.displayName,
        currentUser.role,
        'DELETE_DEPARTMENT',
        'Departments',
        id,
        `Deleted department ${dept.name} (${dept.code})`
      );
    }
  }

  /**
   * Only Administrator can delete/deactivate department
   */
  toggleDepartmentStatus(id: string): void {
    if (!this.authService.isAdmin()) {
      throw new Error('Unauthorized: Only Administrators can toggle department status.');
    }

    this.departments.update(list =>
      list.map(d => {
        if (d.id === id) {
          const newStatus = !d.isActive;
          const currentUser = this.authService.currentUser();
          if (currentUser) {
            this.auditLogService.log(
              currentUser.uid,
              currentUser.displayName,
              currentUser.role,
              newStatus ? 'ACTIVATE_DEPARTMENT' : 'DEACTIVATE_DEPARTMENT',
              'Departments',
              id,
              `${newStatus ? 'Activated' : 'Deactivated'} department ${d.name}`
            );
          }
          return { ...d, isActive: newStatus };
        }
        return d;
      })
    );
  }
}
