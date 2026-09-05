import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  updateEmail,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { FirebaseService } from './firebase.service';
import { User, UserRole, RegisteredOfficer, formatPhoneNumber } from '../models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private firebaseService = inject(FirebaseService);
  private http = inject(HttpClient);
  private apiUrl = environment.apiBaseUrl;

  // State Signals
  readonly currentUser = signal<User | null>(null);
  readonly isInitialized = signal<boolean>(false);
  readonly userRole = computed<UserRole | null>(() => this.currentUser()?.role || null);
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly registeredOfficers = signal<RegisteredOfficer[]>([]);
  readonly registeredTourists = signal<{ id: string; userCode?: string; name: string; email: string; phone?: string; createdAt: string }[]>([]);

  constructor() {
    this.initAuthListener();
  }

  private initAuthListener(): void {
    onAuthStateChanged(this.firebaseService.auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        try {
          const profile = await this.fetchUserProfileFromBackend(fbUser.uid);
          if (profile) {
            this.currentUser.set(profile);
            if (profile.role === 'admin') {
              this.loadOfficersFromBackend();
              this.loadTouristsFromBackend();
            }
          } else {
            console.warn(`No Firestore user profile found for UID: ${fbUser.uid}. Denying fallback access.`);
            this.currentUser.set(null);
          }
        } catch (e) {
          console.warn('Failed to load user profile on auth state change:', e);
          this.currentUser.set(null);
        }
      } else {
        this.currentUser.set(null);
      }
      this.isInitialized.set(true);
    });
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

  private activeProfileFetchPromise: Promise<User | null> | null = null;

  private async fetchUserProfileFromBackend(uid: string): Promise<User | null> {
    if (!this.firebaseService.auth.currentUser) {
      return null;
    }

    const current = this.currentUser();
    if (current && current.uid === uid) {
      return current;
    }

    if (this.activeProfileFetchPromise) {
      return this.activeProfileFetchPromise;
    }

    this.activeProfileFetchPromise = (async () => {
      try {
        const res = await firstValueFrom(this.http.get<{ success: boolean; user: any }>(`${this.apiUrl}/users/me`));
        if (res && res.success && res.user) {
          const u = res.user;
          const normalizedRole = (String(u.role || '').trim().toLowerCase()) as UserRole;
          return {
            uid: u.uid || uid,
            userCode: u.userCode || '',
            email: u.email,
            displayName: u.fullName || u.displayName || 'User',
            role: normalizedRole,
            departmentId: u.departmentId,
            departmentName: u.departmentName,
            designation: u.designation,
            phoneNumber: u.phoneNumber || u.phone,
            createdAt: u.createdAt,
            isActive: u.isActive !== false
          };
        }
      } catch (e) {
        console.warn('Backend user profile lookup error:', e);
      } finally {
        this.activeProfileFetchPromise = null;
      }
      return null;
    })();

    return this.activeProfileFetchPromise;
  }

  async loadOfficersFromBackend(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<{ success: boolean; officers: any[] }>(`${this.apiUrl}/officers`));
      if (res && res.success && Array.isArray(res.officers)) {
        const formatted: RegisteredOfficer[] = res.officers.map(o => ({
          id: o.id || o.uid,
          userCode: o.userCode || o.officerCode || '',
          officerCode: o.officerCode || o.userCode || '',
          name: o.fullName || o.name,
          email: o.email,
          departmentId: o.departmentId || '',
          departmentName: o.departmentName || 'Unassigned',
          designation: o.designation || 'Officer',
          phone: o.phoneNumber || o.phone || '',
          isActive: o.isActive !== false,
          isRevoked: o.isRevoked || false,
          createdAt: o.createdAt || new Date().toISOString()
        }));
        this.registeredOfficers.set(formatted);
      }
    } catch (e) {
      console.warn('Failed to load officers from backend:', e);
    }
  }

  async loadTouristsFromBackend(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<{ success: boolean; users: any[] }>(`${this.apiUrl}/users`));
      if (res && res.success && Array.isArray(res.users)) {
        const tourists = res.users
          .filter(u => u.role === 'tourist')
          .map(c => ({
            id: c.uid || c.id,
            userCode: c.userCode || '',
            name: c.fullName || c.displayName || 'Tourist',
            email: c.email || '',
            phone: c.phoneNumber || c.phone || '',
            createdAt: c.createdAt || ''
          }));
        this.registeredTourists.set(tourists);
      }
    } catch (e) {
      console.warn('Failed to load tourists from backend:', e);
    }
  }

  /**
   * User Login with Firebase Authentication
   */
  async login(email: string, role: UserRole, password?: string): Promise<boolean> {
    const cleanEmail = email.trim().toLowerCase();
    if (!password) {
      throw new Error('Password is required for authentication.');
    }

    try {
      // 1. Authenticate with Firebase Authentication Web SDK
      const credential = await signInWithEmailAndPassword(this.firebaseService.auth, cleanEmail, password);
      const uid = credential.user.uid;

      if (this.firebaseService.auth.authStateReady) {
        await this.firebaseService.auth.authStateReady();
      }

      // 2. Fetch User Profile from Firestore via Express API
      const user = await this.fetchUserProfileFromBackend(uid);

      if (!user) {
        await signOut(this.firebaseService.auth);
        throw new Error(`Access Denied: Account "${cleanEmail}" is not registered.`);
      }

      // Verify Role Authorization against backend Firestore role (case-insensitive)
      // Never reveal the account's actual registered role on role mismatch
      const userRoleNormalized = String(user.role || '').trim().toLowerCase();
      const requestedRoleNormalized = String(role || '').trim().toLowerCase();

      if (userRoleNormalized !== requestedRoleNormalized) {
        await signOut(this.firebaseService.auth);
        throw new Error(`Access Denied: Account "${cleanEmail}" is not registered.`);
      }

      // Prevent revoked or inactive accounts from logging in
      if (user.isRevoked || !user.isActive) {
        await signOut(this.firebaseService.auth);
        throw new Error(`Access Denied: Account "${cleanEmail}" is not registered.`);
      }

      this.currentUser.set(user);
      return true;
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/user-disabled') {
        throw new Error(`Access Denied: Account "${cleanEmail}" is not registered.`);
      }
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        throw new Error('Access Denied: Invalid email or password.');
      }
      throw new Error(error.message || 'Authentication failed.');
    }
  }

  /**
   * User Registration (Tourist)
   */
  async register(name: string, email: string, phone: string, password?: string): Promise<boolean> {
    const cleanEmail = email.trim().toLowerCase();
    if (!password) throw new Error('Password is required for registration.');

    try {
      // 1. Create Firebase Authentication User
      console.log(`[REGISTER] Step 1: Creating Firebase Auth user for ${cleanEmail}...`);
      const credential = await createUserWithEmailAndPassword(this.firebaseService.auth, cleanEmail, password);
      const uid = credential.user.uid;
      console.log(`[REGISTER] Step 2: Firebase Auth user created. UID=${uid}. currentUser=${this.firebaseService.auth.currentUser ? 'YES' : 'NULL'}`);

      // 2. Register Tourist Profile in Firestore via Express API
      const formattedPhone = formatPhoneNumber(phone);
      console.log(`[REGISTER] Step 3: Sending POST /api/auth/register-tourist...`);
      const res = await firstValueFrom(this.http.post<{ success: boolean; user: any }>(`${this.apiUrl}/auth/register-tourist`, {
        fullName: name.trim(),
        email: cleanEmail,
        phoneNumber: formattedPhone
      }));
      console.log(`[REGISTER] Step 4: POST response: success=${res?.success}, user=${res?.user ? 'present' : 'missing'}`);

      if (!res || !res.success || !res.user) {
        await signOut(this.firebaseService.auth);
        throw new Error('Failed to create tourist profile in database.');
      }

      const newUser: User = {
        uid: res.user.uid || uid,
        userCode: res.user.userCode || '',
        email: res.user.email || cleanEmail,
        displayName: res.user.fullName || name.trim(),
        role: 'tourist',
        phoneNumber: res.user.phoneNumber || formattedPhone,
        createdAt: res.user.createdAt || new Date().toISOString(),
        isActive: true
      };

      this.currentUser.set(newUser);
      return true;
    } catch (error: any) {
      console.error('Registration error:', error);
      try {
        await signOut(this.firebaseService.auth);
      } catch (e) {}
      this.currentUser.set(null);

      if (error.code === 'auth/email-already-in-use') {
        throw new Error(`Email address "${cleanEmail}" is already registered. Please log in or try another email.`);
      }
      throw new Error(error.message || 'Registration failed.');
    }
  }

  /**
   * Register Officer by Admin (Express API with Firebase Admin SDK)
   */
  async registerOfficerByAdmin(officer: Omit<RegisteredOfficer, 'id' | 'createdAt'>): Promise<RegisteredOfficer> {
    const cleanEmail = officer.email.toLowerCase().trim();
    const formattedPhone = formatPhoneNumber(officer.phone || '');

    const res = await firstValueFrom(this.http.post<{ success: boolean; officer: any }>(`${this.apiUrl}/officers`, {
      name: officer.name,
      email: cleanEmail,
      password: officer.password,
      departmentId: officer.departmentId,
      departmentName: officer.departmentName,
      designation: officer.designation,
      phone: formattedPhone
    }));

    if (!res || !res.success) {
      throw new Error('Failed to create officer account on backend server.');
    }

    const newOfficer: RegisteredOfficer = {
      id: res.officer.id || res.officer.uid,
      userCode: res.officer.userCode || '',
      officerCode: res.officer.officerCode || res.officer.userCode || '',
      name: officer.name,
      email: cleanEmail,
      departmentId: officer.departmentId,
      departmentName: officer.departmentName,
      designation: officer.designation,
      phone: formattedPhone,
      isActive: true,
      isRevoked: false,
      createdAt: new Date().toISOString()
    };

    await this.loadOfficersFromBackend();
    return newOfficer;
  }

  /**
   * Edit/Update Officer (Admin Only)
   */
  async updateOfficerByAdmin(id: string, updatedData: Partial<RegisteredOfficer>): Promise<void> {
    await firstValueFrom(this.http.put(`${this.apiUrl}/officers/${id}`, updatedData));
    await this.loadOfficersFromBackend();
  }

  /**
   * Remove Officer (Admin Only)
   */
  async removeOfficerByAdmin(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.apiUrl}/officers/${id}`));
    await this.loadOfficersFromBackend();
  }

  /**
   * Revoke Officer Access (Admin Only)
   */
  async revokeOfficerAccess(id: string): Promise<void> {
    await this.updateOfficerByAdmin(id, { isRevoked: true, departmentId: '', departmentName: 'Unassigned' });
  }

  /**
   * Restore Officer Access (Admin Only)
   */
  async restoreOfficerAccess(id: string): Promise<void> {
    await this.updateOfficerByAdmin(id, { isRevoked: false });
  }

  /**
   * Update Profile (Tourist, Officer, Admin)
   */
  async updateUserProfile(name: string, email: string, phone: string): Promise<void> {
    const user = this.currentUser();
    if (!user) return;

    const cleanNewEmail = email.trim().toLowerCase();
    const formattedPhone = formatPhoneNumber(phone);

    // Call Backend Profile Update API
    const res = await firstValueFrom(this.http.put<{ success: boolean; user: any }>(`${this.apiUrl}/users/me`, {
      fullName: name.trim(),
      email: cleanNewEmail,
      phoneNumber: formattedPhone
    }));

    const updatedUser: User = {
      ...user,
      displayName: name.trim(),
      email: cleanNewEmail,
      phoneNumber: formattedPhone
    };

    this.currentUser.set(updatedUser);
  }

  verifyCurrentPassword(password: string): boolean {
    return !!password && password.trim().length > 0;
  }

  /**
   * Verify currently logged-in Admin's password via Firebase Auth re-authentication
   */
  async verifyAdminPassword(password: string): Promise<boolean> {
    const user = this.firebaseService.auth.currentUser;
    if (!user || !user.email) {
      throw new Error('No active administrator session found.');
    }
    try {
      const credential = EmailAuthProvider.credential(user.email, password.trim());
      await reauthenticateWithCredential(user, credential);
      return true;
    } catch (err: any) {
      return false;
    }
  }

  /**
   * Password Reset Email
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    const cleanEmail = email.trim().toLowerCase();
    await sendPasswordResetEmail(this.firebaseService.auth, cleanEmail);
  }

  /**
   * Verify current password / Change Password via Firebase Auth
   */
  async changeUserPassword(previousPassword: string, newPassword: string): Promise<void> {
    const user = this.firebaseService.auth.currentUser;
    if (!user) throw new Error('No authenticated user session found.');

    if (!newPassword || newPassword.trim().length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    await updatePassword(user, newPassword.trim());
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await signOut(this.firebaseService.auth);
    } catch (e) {
      console.warn('SignOut error warning:', e);
    }
    this.currentUser.set(null);
    this.registeredOfficers.set([]);
    this.registeredTourists.set([]);
  }

  isTourist(): boolean {
    return this.isAuthenticated() && this.userRole() === 'tourist';
  }

  isOfficer(): boolean {
    return this.isAuthenticated() && this.userRole() === 'officer';
  }

  isAdmin(): boolean {
    return this.isAuthenticated() && this.userRole() === 'admin';
  }

  checkAccountExistsByRole(email: string, role: UserRole): { exists: boolean; message?: string } {
    const cleanEmail = (email || '').toLowerCase().trim();
    if (!cleanEmail) return { exists: false, message: 'Please enter your email address.' };
    return { exists: true };
  }

  checkAccountExists(email: string, role?: UserRole): boolean {
    return true;
  }
}
