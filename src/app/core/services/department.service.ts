import { Injectable, signal, inject, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { collection, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { Department, DepartmentOfficer } from '../models/department.model';
import { AuditLogService } from './audit-log.service';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';
import { GrievanceService } from './grievance.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DepartmentService {
  private http = inject(HttpClient);
  private auditLogService = inject(AuditLogService);
  private authService = inject(AuthService);
  private firebaseService = inject(FirebaseService);
  private injector = inject(Injector);
  private apiUrl = environment.apiBaseUrl;

  readonly departments = signal<Department[]>([]);
  private deptUnsubscribe: Unsubscribe | null = null;

  constructor() {
    this.loadDepartmentsFromBackend();
    this.startRealtimeDeptSync();
  }

  private startRealtimeDeptSync(): void {
    try {
      const colRef = collection(this.firebaseService.db, 'departments');
      this.deptUnsubscribe = onSnapshot(colRef, () => {
        this.loadDepartmentsFromBackend();
      }, (err) => {
        console.warn('Realtime department sync warning:', err?.message || err);
      });
    } catch (err) {
      console.warn('Failed to attach realtime department listener:', err);
    }
  }

  private syncGrievances(): void {
    try {
      const gs = this.injector.get(GrievanceService);
      if (gs) {
        gs.loadGrievancesFromBackend();
      }
    } catch {
      // safe fallback
    }
  }

  async loadDepartmentsFromBackend(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<{ success: boolean; departments: Department[] }>(`${this.apiUrl}/departments`));
      if (res && res.success && Array.isArray(res.departments)) {
        this.departments.set(res.departments);
      }
    } catch (e) {
      console.warn('Failed to load departments from backend:', e);
    }
  }

  /**
   * Create Department (Admin Only)
   */
  async createDepartment(dept: Omit<Department, 'id' | 'createdAt' | 'officerCount' | 'activeComplaintsCount'>): Promise<Department> {
    if (!this.authService.isAdmin()) {
      throw new Error('Unauthorized: Only Administrators can create departments.');
    }

    const cleanName = (dept.name || '').trim().toLowerCase();
    const cleanCode = (dept.code || '').trim().toLowerCase();

    if (cleanName === cleanCode) {
      throw new Error('Department Name and Department Code / ID should not be the same.');
    }

    const res = await firstValueFrom(this.http.post<{ success: boolean; department: Department }>(`${this.apiUrl}/departments`, dept));
    if (!res || !res.success) {
      throw new Error('Failed to create department on backend server.');
    }

    await this.loadDepartmentsFromBackend();
    this.syncGrievances();

    const currentUser = this.authService.currentUser();
    if (currentUser) {
      this.auditLogService.log(
        currentUser.uid,
        currentUser.displayName,
        currentUser.role,
        'CREATE_DEPARTMENT',
        'Departments',
        res.department.id,
        `Created department: ${res.department.name} (${res.department.code})`
      );
    }

    return res.department;
  }

  /**
   * Update Department (Admin Only)
   */
  async updateDepartment(id: string, updates: Partial<Department>): Promise<void> {
    if (!this.authService.isAdmin()) {
      throw new Error('Unauthorized: Only Administrators can edit departments.');
    }

    await firstValueFrom(this.http.put(`${this.apiUrl}/departments/${id}`, updates));
    await this.loadDepartmentsFromBackend();
    this.syncGrievances();

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
   * Add Officer to Department (Single)
   */
  async addOfficerToDepartment(departmentId: string, officer: Omit<DepartmentOfficer, 'id'>): Promise<void> {
    if (!this.authService.isAdmin()) {
      throw new Error('Unauthorized: Only Administrators can modify department officers.');
    }

    const dept = this.departments().find(d => d.id === departmentId);
    const assignedOfficers = dept ? [...(dept.assignedOfficers || [])] : [];
    assignedOfficers.push({
      ...officer,
      id: `off-${Date.now().toString().slice(-4)}`
    });

    await this.updateDepartment(departmentId, {
      assignedOfficers,
      officerCount: assignedOfficers.length
    });
  }

  /**
   * Assign Multiple Officers to Department at once (Admin Only)
   */
  async assignMultipleOfficersToDepartment(departmentId: string, officerIds: string[]): Promise<void> {
    if (!this.authService.isAdmin()) {
      throw new Error('Unauthorized: Only Administrators can modify department officers.');
    }

    if (!officerIds || officerIds.length === 0) {
      throw new Error('Please select at least one officer.');
    }

    const res = await firstValueFrom(this.http.post<{ success: boolean; message: string; assignedOfficers: DepartmentOfficer[] }>(
      `${this.apiUrl}/departments/${departmentId}/officers`,
      { officerIds }
    ));

    if (!res || !res.success) {
      throw new Error(res?.message || 'Failed to assign officers to department.');
    }

    await this.loadDepartmentsFromBackend();
    await this.authService.loadOfficersFromBackend();
    this.syncGrievances();

    const currentUser = this.authService.currentUser();
    if (currentUser) {
      this.auditLogService.log(
        currentUser.uid,
        currentUser.displayName,
        currentUser.role,
        'ASSIGN_OFFICERS',
        'Departments',
        departmentId,
        `Assigned ${officerIds.length} officer(s) to department ID ${departmentId}`
      );
    }
  }

  /**
   * Remove Officer from Department (Admin Only)
   * Updates department, unassigns officer profile, and redistributes active cases.
   */
  async removeOfficerFromDepartment(departmentId: string, officerId: string): Promise<void> {
    if (!this.authService.isAdmin()) {
      throw new Error('Unauthorized: Only Administrators can modify department officers.');
    }

    const res = await firstValueFrom(this.http.delete<{ success: boolean; message: string }>(
      `${this.apiUrl}/departments/${departmentId}/officers/${officerId}`
    ));

    if (!res || !res.success) {
      throw new Error(res?.message || 'Failed to remove officer from department.');
    }

    await this.loadDepartmentsFromBackend();
    await this.authService.loadOfficersFromBackend();
    this.syncGrievances();

    const currentUser = this.authService.currentUser();
    if (currentUser) {
      this.auditLogService.log(
        currentUser.uid,
        currentUser.displayName,
        currentUser.role,
        'REMOVE_OFFICER',
        'Departments',
        departmentId,
        `Removed officer ${officerId} from department ID ${departmentId}`
      );
    }
  }

  async toggleDepartmentStatus(id: string): Promise<void> {
    const dept = this.departments().find(d => d.id === id);
    if (dept) {
      await this.updateDepartment(id, { isActive: !dept.isActive });
    }
  }

  /**
   * Delete Department (Admin Only)
   */
  async deleteDepartment(id: string): Promise<void> {
    if (!this.authService.isAdmin()) {
      throw new Error('Unauthorized: Only Administrators can delete departments.');
    }

    await firstValueFrom(this.http.delete(`${this.apiUrl}/departments/${id}`));
    await this.loadDepartmentsFromBackend();
    this.syncGrievances();

    const currentUser = this.authService.currentUser();
    if (currentUser) {
      this.auditLogService.log(
        currentUser.uid,
        currentUser.displayName,
        currentUser.role,
        'DELETE_DEPARTMENT',
        'Departments',
        id,
        `Deleted department record ID ${id}`
      );
    }
  }

  getDepartmentById(id: string): Department | undefined {
    return this.departments().find(d => d.id === id);
  }

  getDepartmentByCode(code: string): Department | undefined {
    const cleanCode = code.trim().toLowerCase();
    return this.departments().find(d => d.code.trim().toLowerCase() === cleanCode);
  }

  getDepartmentByName(name: string): Department | undefined {
    const cleanName = name.trim().toLowerCase();
    return this.departments().find(d => d.name.trim().toLowerCase() === cleanName);
  }

  getOfficerAssignedDepartment(officerIdOrEmail: string): Department | undefined {
    const cleanStr = officerIdOrEmail.toLowerCase().trim();
    return this.departments().find(d =>
      d.isActive && (d.assignedOfficers || []).some(o => o.id.toLowerCase() === cleanStr || o.email.toLowerCase() === cleanStr)
    );
  }
}
