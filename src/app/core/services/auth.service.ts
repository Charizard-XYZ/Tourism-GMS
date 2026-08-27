import { Injectable, signal, computed, inject } from '@angular/core';
import { User, UserRole, RegisteredOfficer, formatPhoneNumber } from '../models/user.model';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private firebaseService = inject(FirebaseService);

  // State Signals
  readonly currentUser = signal<User | null>(null);
  readonly isInitialized = signal<boolean>(false);
  readonly userRole = computed<UserRole | null>(() => this.currentUser()?.role || null);
  readonly isAuthenticated = computed(() => !!this.currentUser());

  // List of Officers registered by Directorate Admin
  readonly registeredOfficers = signal<RegisteredOfficer[]>([
    {
      id: 'OFF-847291',
      name: 'Ramesh Chand',
      email: 'ramesh.chand@sikkim.gov.in',
      password: 'password123',
      departmentId: 'dept-01',
      departmentName: 'Transport & Mobility Cell',
      designation: 'Senior Transport Inspector',
      phone: '+91 98160 12345',
      isRevoked: false,
      createdAt: new Date().toISOString()
    },
    {
      id: 'OFF-912834',
      name: 'Sunil Kumar',
      email: 'sunil.kumar@sikkim.gov.in',
      password: 'password123',
      departmentId: 'dept-02',
      departmentName: 'Hospitality & Hotel Standards',
      designation: 'Hospitality Nodal Inspector',
      phone: '+91 98160 67890',
      isRevoked: false,
      createdAt: new Date().toISOString()
    }
  ]);

  constructor() {
    this.restoreSessionFromStorage();
    this.syncFromBackend();
  }

  private restoreSessionFromStorage(): void {
    try {
      const savedUser = localStorage.getItem('gms_session_user');
      if (savedUser) {
        this.currentUser.set(JSON.parse(savedUser));
      }

      const savedCitizens = localStorage.getItem('gms_registered_citizens');
      if (savedCitizens) {
        this.registeredCitizens.set(JSON.parse(savedCitizens));
      }

      const savedOfficers = localStorage.getItem('gms_registered_officers');
      if (savedOfficers) {
        this.registeredOfficers.set(JSON.parse(savedOfficers));
      }
    } catch (err) {
      console.warn('Failed to restore authentication session from localStorage:', err);
    } finally {
      this.isInitialized.set(true);
    }
  }

  async ensureInitialized(): Promise<boolean> {
    if (this.isInitialized()) return true;
    return new Promise(resolve => {
      const interval = setInterval(() => {
        if (this.isInitialized()) {
          clearInterval(interval);
          resolve(true);
        }
      }, 10);
    });
  }

  async syncFromBackend() {
    const remoteOfficers = await this.firebaseService.fetchApi<RegisteredOfficer[]>('/officers');
    if (remoteOfficers && Array.isArray(remoteOfficers)) {
      this.registeredOfficers.set(remoteOfficers);
      localStorage.setItem('gms_registered_officers', JSON.stringify(remoteOfficers));
    }

    const remoteCitizens = await this.firebaseService.fetchApi<any[]>('/citizens');
    if (remoteCitizens && Array.isArray(remoteCitizens)) {
      this.registeredCitizens.set(remoteCitizens);
      localStorage.setItem('gms_registered_citizens', JSON.stringify(remoteCitizens));
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

    const formattedPhone = formatPhoneNumber(officer.phone || '');
    const newOfficer: RegisteredOfficer = {
      ...officer,
      email: cleanEmail,
      password: officer.password,
      phone: formattedPhone,
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

    if (updatedData.phone) {
      updatedData.phone = formatPhoneNumber(updatedData.phone);
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
          localStorage.setItem('gms_session_user', JSON.stringify(user));
          resolve(true);
          return;
        }

        if (role === 'admin') {
          const validAdminEmails = ['admin@gmail.com'];
          const isEmailValid = validAdminEmails.includes(cleanEmail);
          const isPasswordValid = password === 'admin';

          if (!isEmailValid || !isPasswordValid) {
            reject(new Error('Access Denied: Invalid email or password.'));
            return;
          }

          const user: User = {
            uid: 'ADM-1001',
            email: cleanEmail,
            displayName: cleanEmail === 'admin@gmail.com' ? 'Abhishek Kumar' : '',
            role: 'admin',
            createdAt: new Date().toISOString(),
            isActive: true
          };
          this.currentUser.set(user);
          localStorage.setItem('gms_session_user', JSON.stringify(user));
          resolve(true);
          return;
        }

        // Citizen / Tourist account validation
        const registered = this.registeredCitizens().find(c => c.email.toLowerCase() === cleanEmail);
        if (!registered) {
          reject(new Error('Access Denied: Invalid email or password.'));
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
        localStorage.setItem('gms_session_user', JSON.stringify(user));
        resolve(true);
      }, 400);
    });
  }

  readonly registeredCitizens = signal<{ id: string; name: string; email: string; password?: string; phone?: string; createdAt: string }[]>([
    {
      id: 'cit-001',
      name: 'Amit Kapoor',
      email: 'amit.kapoor@gmail.com',
      password: 'password123',
      phone: '+91 98765 43210',
      createdAt: new Date().toISOString()
    },
    {
      id: 'cit-002',
      name: 'Neha Sharma',
      email: 'neha.sharma@gmail.com',
      password: 'password123',
      phone: '+91 98160 54321',
      createdAt: new Date().toISOString()
    }
  ]);

  /**
   * User Registration (Tourist / Citizen)
   */
  register(name: string, email: string, phone: string, password?: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const cleanEmail = email.trim().toLowerCase();

        const existingOfficer = this.registeredOfficers().find(o => o.email.toLowerCase().trim() === cleanEmail);
        const existingCitizen = this.registeredCitizens().find(c => c.email.toLowerCase().trim() === cleanEmail);
        const isAdminEmail = cleanEmail === 'admin@gmail.com' || cleanEmail.includes('admin');

        if (existingOfficer || existingCitizen || isAdminEmail) {
          reject(new Error(`Email address "${email}" is already registered. Please log in or try another email.`));
          return;
        }

        const formattedPhone = formatPhoneNumber(phone);
        const citizenRecord = {
          id: `cit-${Date.now().toString().slice(-4)}`,
          name,
          email: cleanEmail,
          password: password,
          phone: formattedPhone,
          createdAt: new Date().toISOString()
        };

        const newUser: User = {
          uid: citizenRecord.id,
          email: cleanEmail,
          displayName: name,
          role: 'citizen',
          phoneNumber: formattedPhone,
          createdAt: citizenRecord.createdAt,
          isActive: true
        };

        this.registeredCitizens.update(list => [...list, citizenRecord]);
        localStorage.setItem('gms_registered_citizens', JSON.stringify(this.registeredCitizens()));
        this.currentUser.set(newUser);
        localStorage.setItem('gms_session_user', JSON.stringify(newUser));

        // Push Citizen Record to Backend API Database
        this.firebaseService.fetchApi('/citizens', {
          method: 'POST',
          body: JSON.stringify(citizenRecord)
        });

        resolve(true);
      }, 400);
    });
  }

  updateUserProfile(name: string, email: string, phone: string): void {
    const user = this.currentUser();
    if (!user) return;

    const cleanNewEmail = email.trim().toLowerCase();
    const cleanOldEmail = user.email.trim().toLowerCase();
    const formattedPhone = formatPhoneNumber(phone);

    // Check unique email across all roles if email was changed
    if (cleanNewEmail !== cleanOldEmail) {
      const isTakenByOfficer = this.registeredOfficers().some(o => o.email.toLowerCase() === cleanNewEmail && o.id !== user.uid);
      const isTakenByCitizen = this.registeredCitizens().some(c => c.email.toLowerCase() === cleanNewEmail && c.id !== user.uid);
      const isAdminEmail = cleanNewEmail === 'admin@gmail.com' || (cleanNewEmail.includes('admin') && user.role !== 'admin');

      if (isTakenByOfficer || isTakenByCitizen || isAdminEmail) {
        throw new Error(`Email address "${email.trim()}" is already registered by another user.`);
      }
    }

    const updatedUser: User = {
      ...user,
      displayName: name.trim(),
      email: cleanNewEmail,
      phoneNumber: formattedPhone
    };

    this.currentUser.set(updatedUser);
    localStorage.setItem('gms_session_user', JSON.stringify(updatedUser));

    // Update in corresponding roster list while preserving user ID and records
    if (user.role === 'citizen') {
      this.registeredCitizens.update(list =>
        list.map(c => (c.id === user.uid || c.email.toLowerCase() === cleanOldEmail)
          ? { ...c, name: name.trim(), email: cleanNewEmail, phone: formattedPhone }
          : c
        )
      );
      localStorage.setItem('gms_registered_citizens', JSON.stringify(this.registeredCitizens()));

      // Push updated Citizen profile to Backend API Database
      this.firebaseService.fetchApi(`/citizens/${user.uid}`, {
        method: 'PUT',
        body: JSON.stringify({
          id: user.uid,
          name: name.trim(),
          email: cleanNewEmail,
          phone: formattedPhone
        })
      });
    } else if (user.role === 'officer') {
      this.registeredOfficers.update(list =>
        list.map(o => (o.id === user.uid || o.email.toLowerCase() === cleanOldEmail)
          ? { ...o, name: name.trim(), email: cleanNewEmail, phone: formattedPhone }
          : o
        )
      );
      localStorage.setItem('gms_registered_officers', JSON.stringify(this.registeredOfficers()));
    }
  }

  logout(): void {
    localStorage.removeItem('gms_session_user');
    this.currentUser.set(null);
  }

  isCitizen(): boolean {
    return this.isAuthenticated() && this.userRole() === 'citizen';
  }

  isOfficer(): boolean {
    return this.isAuthenticated() && this.userRole() === 'officer';
  }

  isAdmin(): boolean {
    return this.isAuthenticated() && this.userRole() === 'admin';
  }
}
