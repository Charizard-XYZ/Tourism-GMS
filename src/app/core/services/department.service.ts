import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Department, DepartmentOfficer } from '../models/department.model';
import { AuditLogService } from './audit-log.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DepartmentService {
  private http = inject(HttpClient);
  private auditLogService = inject(AuditLogService);
  private authService = inject(AuthService);
  private apiUrl = environment.apiBaseUrl;

  readonly departments = signal<Department[]>([]);

  constructor() {
    this.loadDepartmentsFromBackend();
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
   * Add Officer to Department
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
   * Remove Officer from Department
   */
  async removeOfficerFromDepartment(departmentId: string, officerId: string): Promise<void> {
    if (!this.authService.isAdmin()) {
      throw new Error('Unauthorized: Only Administrators can modify department officers.');
    }

    const dept = this.departments().find(d => d.id === departmentId);
    if (!dept) return;

    const filtered = (dept.assignedOfficers || []).filter(o => o.id !== officerId && o.email !== officerId);
    await this.updateDepartment(departmentId, {
      assignedOfficers: filtered,
      officerCount: filtered.length
    });
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
