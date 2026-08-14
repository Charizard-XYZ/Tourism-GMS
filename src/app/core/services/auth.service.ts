import { Injectable, signal, computed } from '@angular/core';
import { User, UserRole, RegisteredOfficer } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // State Signals
  readonly currentUser = signal<User | null>(null);
  readonly userRole = computed(() => this.currentUser()?.role || 'citizen');
  readonly isAuthenticated = computed(() => !!this.currentUser());

  // Roster of Nodal Officers registered by Directorate Admin
  readonly registeredOfficers = signal<RegisteredOfficer[]>([
  ]);

  constructor() {}

  /**
   * Register a new Nodal Officer with Password (Admin Only)
   */
  registerOfficerByAdmin(officer: Omit<RegisteredOfficer, 'id' | 'createdAt'>): RegisteredOfficer {
    const newOfficer: RegisteredOfficer = {
      ...officer,
      password: officer.password || 'password123',
      id: `off-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString()
    };

    this.registeredOfficers.update(list => [...list, newOfficer]);
    return newOfficer;
  }

  /**
   * Edit/Update Nodal Officer (Admin Only)
   */
  updateOfficerByAdmin(id: string, updatedData: Partial<RegisteredOfficer>): void {
    this.registeredOfficers.update(list =>
      list.map(o => o.id === id ? { ...o, ...updatedData } : o)
    );
  }

  /**
   * Remove a Nodal Officer (Admin Only)
   */
  removeOfficerByAdmin(id: string): void {
    this.registeredOfficers.update(list => list.filter(o => o.id !== id));
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

        // Admin & Citizen accounts
        const user: User = {
          uid: `${role.slice(0, 3)}-${Date.now().toString().slice(-4)}`,
          email: 'yoho@gmail.com',
          displayName: role === 'admin' ? 'Abhishek (Admin)' : email.split('@')[0],
          role,
          createdAt: new Date().toISOString(),
          isActive: true
        };
        this.currentUser.set(user);
        resolve(true);
      }, 400);
    });
  }

  /**
   * User Registration (Tourist / Citizen)
   */
  register(name: string, email: string, phone: string): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newUser: User = {
          uid: `cit-${Date.now().toString().slice(-4)}`,
          email,
          displayName: name,
          role: 'citizen',
          phoneNumber: phone,
          createdAt: new Date().toISOString(),
          isActive: true
        };
        this.currentUser.set(newUser);
        resolve(true);
      }, 500);
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
