import { Injectable, signal, computed, inject } from '@angular/core';
import { User, UserRole, RegisteredOfficer } from '../models/user.model';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private firebaseService = inject(FirebaseService);

  // State Signals
  readonly currentUser = signal<User | null>(null);
  readonly userRole = computed(() => this.currentUser()?.role || 'citizen');
  readonly isAuthenticated = computed(() => !!this.currentUser());

  // List of Officers registered by Directorate Admin
  readonly registeredOfficers = signal<RegisteredOfficer[]>([]);

  constructor() {
    this.syncFromBackend();
  }

  async syncFromBackend() {
    const remote = await this.firebaseService.fetchApi<RegisteredOfficer[]>('/officers');
    if (remote && Array.isArray(remote)) {
      this.registeredOfficers.set(remote);
    }
  }

  /**
   * Register a new Officer with Password (Admin Only)
   */
  registerOfficerByAdmin(officer: Omit<RegisteredOfficer, 'id' | 'createdAt'>): RegisteredOfficer {
    const cleanEmail = officer.email.toLowerCase().trim();
    const existing = this.registeredOfficers().find(o => o.email.toLowerCase().trim() === cleanEmail);
    if (existing) {
      throw new Error(`Email address "${officer.email}" is already registered to Officer "${existing.name}". All emails must be unique.`);
    }

    const newOfficer: RegisteredOfficer = {
      ...officer,
      email: cleanEmail,
      password: officer.password,
      id: `OFF-${Math.floor(100000 + Math.random() * 900000)}`,
      createdAt: new Date().toISOString()
    };

    this.registeredOfficers.update(list => [...list, newOfficer]);

    // Push to Firebase REST API
    this.firebaseService.fetchApi<RegisteredOfficer>('/officers', {
      method: 'POST',
      body: JSON.stringify(newOfficer)
    });

    return newOfficer;
  }

  /**
   * Edit/Update Officer (Admin Only)
   */
  updateOfficerByAdmin(id: string, updatedData: Partial<RegisteredOfficer>): void {
    if (updatedData.email) {
      const cleanEmail = updatedData.email.toLowerCase().trim();
      const existing = this.registeredOfficers().find(o => o.id !== id && o.email.toLowerCase().trim() === cleanEmail);
      if (existing) {
        throw new Error(`Email address "${updatedData.email}" is already registered to another Officer ("${existing.name}"). All emails must be unique.`);
      }
    }

    this.registeredOfficers.update(list =>
      list.map(o => o.id === id ? { ...o, ...updatedData } : o)
    );
  }

  /**
   * Remove / Delete Officer Permanently (Admin Only)
   */
  removeOfficerByAdmin(id: string): void {
    this.registeredOfficers.update(list => list.filter(o => o.id !== id));
  }

  /**
   * Revoke Officer Access (Admin Only)
   */
  revokeOfficerAccess(id: string): void {
    this.registeredOfficers.update(list =>
      list.map(o => o.id === id ? { ...o, isRevoked: true, departmentId: '', departmentName: 'Unassigned' } : o)
    );
  }

  /**
   * Restore Officer Access (Admin Only)
   */
  restoreOfficerAccess(id: string): void {
    this.registeredOfficers.update(list =>
      list.map(o => o.id === id ? { ...o, isRevoked: false } : o)
    );
  }

  /**
   * Link officer to a department (Admin Only)
   */
  linkOfficerToDepartment(officerIdOrEmail: string, departmentId: string, departmentName: string): void {
    const cleanStr = officerIdOrEmail.toLowerCase().trim();
    this.registeredOfficers.update(list =>
      list.map(o => {
        if (o.id.toLowerCase() === cleanStr || o.email.toLowerCase() === cleanStr) {
          return {
            ...o,
            departmentId,
            departmentName
          };
        }
        return o;
      })
    );

    const cur = this.currentUser();
    if (cur && (cur.uid.toLowerCase() === cleanStr || cur.email.toLowerCase() === cleanStr)) {
      this.currentUser.set({
        ...cur,
        departmentId,
        departmentName
      });
    }
  }

  /**
   * Unlink officer from department (Admin Only)
   */
  unlinkOfficerFromDepartment(officerIdOrEmail: string): void {
    const cleanStr = officerIdOrEmail.toLowerCase().trim();
    this.registeredOfficers.update(list =>
      list.map(o => {
        if (o.id.toLowerCase() === cleanStr || o.email.toLowerCase() === cleanStr) {
          return {
            ...o,
            departmentId: '',
            departmentName: 'Unassigned'
          };
        }
        return o;
      })
    );

    const cur = this.currentUser();
    if (cur && (cur.uid.toLowerCase() === cleanStr || cur.email.toLowerCase() === cleanStr)) {
      this.currentUser.set({
        ...cur,
        departmentId: '',
        departmentName: 'Unassigned'
      });
    }
  }

  /**
   * Clear department assignment for all officers assigned to a deleted department
   */
  clearDepartmentFromOfficers(departmentId: string): void {
    this.registeredOfficers.update(list =>
      list.map(o => {
        if (o.departmentId === departmentId) {
          return {
            ...o,
            departmentId: '',
            departmentName: 'Unassigned'
          };
        }
        return o;
      })
    );

    const cur = this.currentUser();
    if (cur && cur.departmentId === departmentId) {
      this.currentUser.set({
        ...cur,
        departmentId: '',
        departmentName: 'Unassigned'
      });
    }
  }

  /**
   * User Login with Role & Password Validation
   */
  login(email: string, role: UserRole, password?: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const cleanEmail = email.trim().toLowerCase();

        if (role === 'officer') {
          const registered = this.registeredOfficers().find(o => o.email.toLowerCase() === cleanEmail);
          if (!registered) {
            reject(new Error(`Access Denied: Officer account "${email}" is not registered by Directorate Administrator.`));
            return;
          }

          if (registered.isRevoked) {
            reject(new Error(`Access Denied: Officer credentials for "${email}" have been revoked by Directorate Administrator.`));
            return;
          }

          // Verify Password
          if (password && registered.password && registered.password !== password) {
            reject(new Error(`Invalid password for Officer account "${email}". Please verify credentials.`));
            return;
          }

          const user: User = {
            uid: registered.id,
            email: registered.email,
            displayName: registered.name,
            role: 'officer',
            departmentId: registered.departmentId,
            departmentName: registered.departmentName,
            designation: registered.designation,
            phoneNumber: registered.phone,
            createdAt: registered.createdAt,
            isActive: true
          };
          this.currentUser.set(user);
          resolve(true);
          return;
        }

        if (role === 'admin') {
          const validAdminEmails = ['ab@gmail.com'];
          const isEmailValid = validAdminEmails.includes(cleanEmail);
          const isPasswordValid = password === 'admin';

          if (!isEmailValid || !isPasswordValid) {
            reject(new Error('Access Denied: Invalid email or password.'));
            return;
          }

          const user: User = {
            uid: 'ADM-1001',
            email: cleanEmail,
            displayName: cleanEmail === 'ab@gmail.com' ? 'Abhishek Kumar' : '',
            role: 'admin',
            createdAt: new Date().toISOString(),
            isActive: true
          };
          this.currentUser.set(user);
          resolve(true);
          return;
        }

        // Citizen / Tourist account validation
        const registered = this.registeredCitizens().find(c => c.email.toLowerCase() === cleanEmail);
        if (!registered) {
          reject(new Error(`Access Denied: Account "${email}" is not registered. Please register your tourist account first before logging in.`));
          return;
        }

        // Verify Password
        if (password && registered.password && registered.password !== password) {
          reject(new Error(`Invalid password for account "${email}". Please verify your credentials.`));
          return;
        }

        const user: User = {
          uid: registered.id,
          email: registered.email,
          displayName: registered.name,
          role: 'citizen',
          phoneNumber: registered.phone,
          createdAt: registered.createdAt,
          isActive: true
        };
        this.currentUser.set(user);
        resolve(true);
      }, 400);
    });
  }

  readonly registeredCitizens = signal<{ id: string; name: string; email: string; password?: string; phone?: string; createdAt: string }[]>([]);

  /**
   * User Registration (Tourist / Citizen)
   */
  register(name: string, email: string, phone: string, password?: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const cleanEmail = email.trim().toLowerCase();

        const existingOfficer = this.registeredOfficers().find(o => o.email.toLowerCase().trim() === cleanEmail);
        const existingCitizen = this.registeredCitizens().find(c => c.email.toLowerCase().trim() === cleanEmail);
        const isAdminEmail = cleanEmail === 'ab@gmail.com' || cleanEmail.includes('admin');

        if (existingOfficer || existingCitizen || isAdminEmail) {
          reject(new Error(`Email address "${email}" is already registered. Please log in or try another email.`));
          return;
        }

        const citizenRecord = {
          id: `cit-${Date.now().toString().slice(-4)}`,
          name,
          email: cleanEmail,
          password: password,
          phone,
          createdAt: new Date().toISOString()
        };

        const newUser: User = {
          uid: citizenRecord.id,
          email: cleanEmail,
          displayName: name,
          role: 'citizen',
          phoneNumber: phone,
          createdAt: citizenRecord.createdAt,
          isActive: true
        };

        this.registeredCitizens.update(list => [...list, citizenRecord]);
        this.currentUser.set(newUser);
        resolve(true);
      }, 400);
    });
  }

  logout(): void {
    this.currentUser.set(null);
  }

  isCitizen(): boolean {
    return this.userRole() === 'citizen';
  }

  isOfficer(): boolean {
    return this.userRole() === 'officer';
  }

  isAdmin(): boolean {
    return this.userRole() === 'admin';
  }
}
