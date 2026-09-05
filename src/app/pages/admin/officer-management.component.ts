import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DepartmentService } from '../../core/services/department.service';
import { AuthService } from '../../core/services/auth.service';
import { GrievanceService } from '../../core/services/grievance.service';
import { ToastComponent } from '../../common/components/toast.component';
import { RegisteredOfficer, formatPhoneNumber, isPhoneTextInvalid } from '../../core/models/user.model';
import { capitalizeFirstChar } from '../../core/directives/capitalize-first.directive';

@Component({
  selector: 'app-officer-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <div class="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div class="inline-flex items-center space-x-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold uppercase mb-1">
            <span>Directorate Admin Portal</span>
          </div>
          <h1 class="text-2xl font-extrabold text-slate-900"> Officer Account Management</h1>
          <p class="text-xs text-slate-500">Register and edit Officers with secure credentials. Only registered officers can log in under Officer Login.</p>
        </div>

        <div class="flex items-center space-x-3">
          <button (click)="isRevokedModalOpen.set(true)" class="px-4 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-extrabold hover:bg-rose-700 shadow-md flex items-center space-x-2 transition">
            <span>Revoked Officers</span>
            <span class="px-2 py-0.5 bg-white/20 text-white text-[11px] font-bold rounded-full">{{ getRevokedOfficersCount() }}</span>
          </button>

          <button (click)="openRegisterModal()" class="px-5 py-2.5 bg-[#0F172A] text-white rounded-xl text-xs font-extrabold hover:bg-slate-800 shadow-md flex items-center space-x-2 transition">
            <span>Register New Officer</span>
          </button>
        </div>
      </div>

      <!-- Search & Department Filter Bar -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid sm:grid-cols-2 gap-4">
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input 
            type="text" 
            [ngModel]="searchKeyword" 
            (ngModelChange)="onSearchChange($event)"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            data-lpignore="true"
            placeholder="Search by Officer ID (e.g. OFF-...), Name, or Email..." 
            class="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#A0C8C3]"
          />
        </div>

        <select [(ngModel)]="departmentFilter" class="px-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#A0C8C3]">
          <option value="ALL">All Departments</option>
          <option *ngFor="let d of departmentService.departments()" [value]="d.id">
            {{ d.name }} ({{ d.code }})
          </option>
        </select>
      </div>

      <!-- Officer list Table -->
      <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-900 text-white uppercase text-[10px] font-bold">
            <tr>
              <th class="p-4">Officer Code</th>
              <th class="p-4">Officer Name</th>
              <th class="p-4">Assigned Department</th>
              <th class="p-4">Official Email (Login)</th>
              <th class="p-4">Contact Phone</th>
              <th class="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <tr *ngFor="let off of filteredOfficers()" class="hover:bg-slate-50">
              <td class="p-4 font-mono font-bold text-amber-700">{{ off.userCode || off.id }}</td>
              <td class="p-4 font-bold text-slate-900">{{ off.name }}</td>
              <td class="p-4 font-bold">
                <span *ngIf="getOfficerDepartmentName(off) !== 'Unassigned'" class="text-teal-800">{{ getOfficerDepartmentName(off) }}</span>
                <span *ngIf="getOfficerDepartmentName(off) === 'Unassigned'" class="text-rose-600 italic">Unassigned</span>
              </td>
              <td class="p-4 text-slate-600 font-mono">{{ off.email }}</td>
              <td class="p-4 text-slate-500">{{ off.phone || '—' }}</td>
              <td class="p-4 text-right space-x-2">
                <button (click)="openEditModal(off)" class="px-3 py-1.5 bg-slate-100 text-slate-800 hover:bg-slate-200 rounded-lg text-xs font-bold transition">
                  Edit
                </button>
                <button (click)="confirmRevoke(off)" class="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold transition">
                  Revoke Access
                </button>
              </td>
            </tr>

            <tr *ngIf="filteredOfficers().length === 0">
              <td colspan="6" class="p-8 text-center text-slate-400 italic">
                No active Officers found matching the search criteria.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Register / Edit Officer Modal -->
      <div *ngIf="isModalOpen()" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div class="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
          <div class="flex justify-between items-center border-b pb-3">
            <h3 class="font-bold text-lg text-slate-900">{{ editingOfficerId() ? 'Edit Officer' : 'Register Officer' }}</h3>
            <button (click)="isModalOpen.set(false)" aria-label="Close modal" class="text-slate-400 hover:text-slate-600 transition">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form (submit)="promptSaveOfficer()" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name *</label>
              <input type="text" [ngModel]="newOfficer.name" (ngModelChange)="onOfficerNameChange($event)" name="reg_sec_name" required autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" placeholder="Enter full name" class="w-full px-3 py-2 border rounded-xl text-xs" />
              <p *ngIf="hasSubmitted() && !newOfficer.name.trim()" class="text-[11px] text-rose-600 font-bold mt-1">Please fill out all required fields.</p>
              <p *ngIf="hasSubmitted() && isNameNumericInvalid(newOfficer.name)" class="text-[11px] text-rose-600 font-bold mt-1">Names can not be in number</p>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Official Email Address *</label>
              <input type="email" [(ngModel)]="newOfficer.email" [disabled]="!!editingOfficerId()" name="reg_sec_email" required autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" placeholder="officer@sikkim.gov.in" class="w-full px-3 py-2 border rounded-xl text-xs disabled:bg-slate-100 disabled:text-slate-500" />
              <p *ngIf="hasSubmitted() && !newOfficer.email.trim()" class="text-[11px] text-rose-600 font-bold mt-1">Please fill out all required fields.</p>
              <p *ngIf="hasSubmitted() && newOfficer.email.trim() && !isEmailValid(newOfficer.email)" class="text-[11px] text-rose-600 font-bold mt-1">Invalid email format.</p>
            </div>

            <!-- Password section for Edit Mode: Show only 'Change Password' button by default -->
            <div *ngIf="editingOfficerId() && !isPasswordChangeUnlocked()" class="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
              <div>
                <p class="text-xs font-bold text-slate-800">Officer Password</p>
                <p class="text-[11px] text-slate-500">Requires administrator authorization to modify</p>
              </div>
              <button 
                type="button" 
                (click)="openAdminPasswordPrompt()" 
                class="px-3 py-1.5 bg-[#0F172A] text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition"
              >
                Change Password
              </button>
            </div>

            <!-- Password Fields: Shown for new registration, or in edit mode ONLY after successful Admin verification -->
            <div *ngIf="!editingOfficerId() || isPasswordChangeUnlocked()" class="space-y-4">
              <div>
                <div class="flex justify-between items-center mb-1">
                  <label class="block text-xs font-bold text-slate-700 uppercase">{{ editingOfficerId() ? 'New Password *' : 'Create Password *' }}</label>
                  <span *ngIf="isPasswordChangeUnlocked()" class="text-[10px] text-emerald-600 font-bold uppercase flex items-center space-x-1">
                    <span>Admin Authorized</span>
                    <svg class="w-3.5 h-3.5 text-emerald-600 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                </div>
                <div class="relative">
                  <input 
                    [type]="showPassword() ? 'text' : 'password'" 
                    [(ngModel)]="newOfficer.password" 
                    name="reg_sec_pass" 
                    [required]="!editingOfficerId()" 
                    autocomplete="one-time-code"
                    autocorrect="off"
                    autocapitalize="off"
                    spellcheck="false"
                    data-lpignore="true"
                    placeholder="••••••••" 
                    class="w-full px-3 py-2 pr-10 border rounded-xl text-xs font-mono" 
                  />
                  <button 
                    type="button" 
                    (click)="showPassword.set(!showPassword())" 
                    aria-label="Toggle officer password visibility"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1 focus:outline-none"
                  >
                    {{ showPassword() ? 'Hide' : 'Show' }}
                  </button>
                </div>
                <p *ngIf="hasSubmitted() && !editingOfficerId() && !newOfficer.password.trim()" class="text-[11px] text-rose-600 font-bold mt-1">Please fill out all required fields.</p>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Confirm Password *</label>
                <div class="relative">
                  <input 
                    [type]="showConfirmPassword() ? 'text' : 'password'" 
                    [(ngModel)]="newOfficer.confirmPassword" 
                    name="reg_confirm_sec_pass" 
                    [required]="!editingOfficerId()" 
                    autocomplete="one-time-code"
                    autocorrect="off"
                    autocapitalize="off"
                    spellcheck="false"
                    data-lpignore="true"
                    placeholder="••••••••" 
                    class="w-full px-3 py-2 pr-10 border rounded-xl text-xs font-mono" 
                  />
                  <button 
                    type="button" 
                    (click)="showConfirmPassword.set(!showConfirmPassword())" 
                    aria-label="Toggle confirm password visibility"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1 focus:outline-none"
                  >
                    {{ showConfirmPassword() ? 'Hide' : 'Show' }}
                  </button>
                </div>
                <p *ngIf="hasSubmitted() && !editingOfficerId() && !newOfficer.confirmPassword.trim()" class="text-[11px] text-rose-600 font-bold mt-1">Please fill out all required fields.</p>
                <p *ngIf="hasSubmitted() && newOfficer.password.trim() && newOfficer.confirmPassword.trim() && newOfficer.password !== newOfficer.confirmPassword" class="text-[11px] text-rose-600 font-bold mt-1">Passwords do not match.</p>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Assign Target Department</label>
              <select [(ngModel)]="newOfficer.departmentId" name="sec_dept_assign_val" class="w-full px-3 py-2 border rounded-xl text-xs bg-white font-bold">
                <option value="">Leave Unassigned for now</option>
                <option *ngFor="let d of departmentService.departments()" [value]="d.id">
                  {{ d.name }} ({{ d.code }})
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Contact Phone</label>
              <input type="text" [ngModel]="newOfficer.phone" (ngModelChange)="onOfficerPhoneChange($event)" name="sec_off_ph_val" autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" placeholder="Enter mobile number" class="w-full px-3 py-2 border rounded-xl text-xs" />
              <p *ngIf="hasSubmitted() && newOfficer.phone.trim() && isPhoneTextInvalid(newOfficer.phone)" class="text-[11px] text-rose-600 font-bold mt-1">Enter phone number</p>
            </div>

            <div class="flex space-x-3 pt-4 border-t">
              <button type="button" (click)="isModalOpen.set(false)" class="flex-1 bg-slate-100 py-3 rounded-xl text-xs font-bold text-slate-600">Cancel</button>
              <button type="submit" class="flex-1 bg-[#0F172A] text-white py-3 rounded-xl text-xs font-extrabold hover:bg-slate-800">
                {{ editingOfficerId() ? 'Save Changes' : 'Register Officer' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Revoked Officers Roster Modal (Layer: z-50) -->
      <div *ngIf="isRevokedModalOpen()" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div class="bg-white rounded-3xl max-w-3xl w-full p-6 space-y-4 shadow-2xl animate-fade-in relative max-h-[85vh] overflow-y-auto">
          <div class="flex justify-between items-center border-b pb-3">
            <div>
              <span class="px-2.5 py-0.5 bg-rose-100 text-rose-800 font-extrabold uppercase text-[10px] rounded-full">Access Revoked Roster</span>
              <h3 class="font-extrabold text-lg text-slate-900 mt-1">Revoked Officers Roster</h3>
            </div>
            <button (click)="isRevokedModalOpen.set(false)" aria-label="Close revoked roster" class="text-slate-400 hover:text-slate-600 transition">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p class="text-xs text-slate-500">List of officers whose credentials have been revoked by Admin. Revoked officers cannot log in. You can restore access or permanently remove officer records.</p>

          <div class="overflow-x-auto border border-slate-200 rounded-2xl">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-900 text-white uppercase text-[10px] font-bold">
                <tr>
                  <th class="p-3">Officer Code</th>
                  <th class="p-3">Name</th>
                  <th class="p-3">Email</th>
                  <th class="p-3">Phone</th>
                  <th class="p-3">Status</th>
                  <th class="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-medium">
                <tr *ngFor="let off of getRevokedOfficers()" class="hover:bg-slate-50">
                  <td class="p-3 font-bold text-rose-700 font-mono">{{ off.userCode || off.id }}</td>
                  <td class="p-3 font-bold text-slate-900">{{ off.name }}</td>
                  <td class="p-3 text-slate-600 font-mono">{{ off.email }}</td>
                  <td class="p-3 text-slate-500">{{ off.phone || '—' }}</td>
                  <td class="p-3">
                    <span class="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-extrabold uppercase rounded-md">Access Revoked</span>
                  </td>
                  <td class="p-3 text-right space-x-2">
                    <button (click)="confirmUnrevoke(off)" class="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-xs font-bold transition">
                      Restore Access
                    </button>
                    <button (click)="confirmDelete(off)" class="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-xs font-bold transition">
                      Delete Permanently
                    </button>
                  </td>
                </tr>

                <tr *ngIf="getRevokedOfficers().length === 0">
                  <td colspan="6" class="p-8 text-center text-slate-400 italic text-xs">
                    No revoked officers found in system roster.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="pt-2 text-right">
            <button (click)="isRevokedModalOpen.set(false)" class="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800">Close</button>
          </div>
        </div>
      </div>

      <!-- Admin Password Verification Modal (Layer: z-[70] so it stacks over Roster) -->
      <div *ngIf="isAdminPasswordModalOpen()" class="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 animate-fade-in">
        <div class="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
          <div class="flex justify-between items-center border-b pb-3">
            <h3 class="font-bold text-base text-slate-900">Admin Authorization Required</h3>
            <button (click)="isAdminPasswordModalOpen.set(false)" aria-label="Close admin verification" class="text-slate-400 hover:text-slate-600 transition">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p class="text-xs text-slate-600">Please enter your Administrator password to authorize changing this officer's password.</p>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Your Admin Password</label>
            <input 
              type="password" 
              [(ngModel)]="adminVerifyPassword" 
              placeholder="••••••••" 
              class="w-full px-3 py-2 border rounded-xl text-xs font-mono"
            />
            <p *ngIf="adminVerifyError()" class="text-[11px] text-rose-600 font-bold mt-1">{{ adminVerifyError() }}</p>
          </div>
          <div class="flex space-x-2 pt-2 border-t">
            <button (click)="isAdminPasswordModalOpen.set(false)" class="flex-1 bg-slate-100 py-2.5 rounded-xl text-xs font-bold text-slate-600">Cancel</button>
            <button (click)="verifyAdminAndUnlockPassword()" [disabled]="!adminVerifyPassword.trim() || isVerifyingAdmin" class="flex-1 bg-[#0F172A] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 disabled:opacity-50">
              {{ isVerifyingAdmin ? 'Verifying...' : 'Authorize' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Action Confirmation Dialog (Layer: z-[70] so it stacks over Roster and blocks background) -->
      <div *ngIf="confirmationModal()" class="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 animate-fade-in">
        <div class="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
          <div class="flex justify-between items-center border-b pb-3">
            <h3 class="font-bold text-base text-slate-900">{{ confirmationModal()?.title }}</h3>
            <button (click)="confirmationModal.set(null)" aria-label="Close dialog" class="text-slate-400 hover:text-slate-600 transition">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p class="text-xs text-slate-600">{{ confirmationModal()?.message }}</p>
          <div class="flex space-x-2 pt-3 border-t">
            <button (click)="confirmationModal.set(null)" class="flex-1 bg-slate-100 py-2.5 rounded-xl text-xs font-bold text-slate-600">
              Cancel
            </button>
            <button 
              (click)="executeConfirmedAction()" 
              [class]="confirmationModal()?.isDestructive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#0F172A] hover:bg-slate-800'"
              class="flex-1 text-white py-2.5 rounded-xl text-xs font-bold transition shadow-sm"
            >
              {{ confirmationModal()?.confirmBtnText || 'Confirm' }}
            </button>
          </div>
        </div>
      </div>

      <app-toast [message]="toastMessage()" (dismiss)="toastMessage.set(null)"></app-toast>

    </div>
  `
})
export class OfficerManagementComponent {
  departmentService = inject(DepartmentService);
  authService = inject(AuthService);
  grievanceService = inject(GrievanceService);

  isModalOpen = signal<boolean>(false);
  isRevokedModalOpen = signal<boolean>(false);
  editingOfficerId = signal<string | null>(null);
  showPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);
  hasSubmitted = signal<boolean>(false);
  toastMessage = signal<string | null>(null);

  // Admin password gate for officer password changes
  isAdminPasswordModalOpen = signal<boolean>(false);
  adminVerifyPassword = '';
  adminVerifyError = signal<string | null>(null);
  isVerifyingAdmin = false;
  isPasswordChangeUnlocked = signal<boolean>(false);

  // Action Confirmation Dialog
  confirmationModal = signal<{
    title: string;
    message: string;
    confirmBtnText: string;
    isDestructive?: boolean;
    action: () => Promise<void>;
  } | null>(null);

  searchKeyword = '';
  departmentFilter = 'ALL';

  onSearchChange(val: string) {
    this.searchKeyword = capitalizeFirstChar(val);
  }

  onOfficerNameChange(val: string) {
    this.newOfficer.name = capitalizeFirstChar(val);
  }

  filteredOfficers(): RegisteredOfficer[] {
    return this.authService.registeredOfficers().filter(off => {
      if (off.isRevoked) return false;
      const keyword = this.searchKeyword.toLowerCase().trim();
      const matchesSearch = !keyword ||
        (off.userCode && off.userCode.toLowerCase().includes(keyword)) ||
        off.id.toLowerCase().includes(keyword) ||
        off.name.toLowerCase().includes(keyword) ||
        off.email.toLowerCase().includes(keyword) ||
        (off.phone && off.phone.toLowerCase().includes(keyword));

      const matchesDept = this.departmentFilter === 'ALL' || off.departmentId === this.departmentFilter || off.departmentName === this.departmentFilter;

      return matchesSearch && matchesDept;
    });
  }

  getRevokedOfficers(): RegisteredOfficer[] {
    return this.authService.registeredOfficers().filter(off => off.isRevoked === true);
  }

  getRevokedOfficersCount(): number {
    return this.getRevokedOfficers().length;
  }

  getOfficerDepartmentName(off: RegisteredOfficer): string {
    if (!off.departmentId || off.departmentName === 'Unassigned') return 'Unassigned';
    const dept = this.departmentService.departments().find(d => d.id === off.departmentId || d.name === off.departmentName);
    if (!dept) return 'Unassigned';

    if (dept.assignedOfficers && dept.assignedOfficers.length > 0) {
      const isAssigned = dept.assignedOfficers.some(o => o.id === off.id || o.email.toLowerCase() === off.email.toLowerCase());
      if (!isAssigned) {
        return 'Unassigned';
      }
    }

    return dept.name;
  }

  newOfficer = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    departmentId: '',
    phone: '',
    designation: ''
  };

  openRegisterModal() {
    this.editingOfficerId.set(null);
    this.hasSubmitted.set(false);
    this.isPasswordChangeUnlocked.set(true); // For new registration, password input is enabled
    const defaultDept = this.departmentService.departments()[0]?.id || '';
    this.newOfficer = { name: '', email: '', password: '', confirmPassword: '', departmentId: defaultDept, phone: '', designation: '' };
    this.isModalOpen.set(true);
  }

  openEditModal(off: RegisteredOfficer) {
    this.editingOfficerId.set(off.id);
    this.hasSubmitted.set(false);
    this.isPasswordChangeUnlocked.set(false); // Locked by default; requires Admin password verification
    this.newOfficer = {
      name: off.name,
      email: off.email,
      password: '',
      confirmPassword: '',
      departmentId: off.departmentId || '',
      phone: off.phone || '',
      designation: off.designation || ''
    };
    this.isModalOpen.set(true);
  }

  openAdminPasswordPrompt() {
    this.adminVerifyPassword = '';
    this.adminVerifyError.set(null);
    this.isAdminPasswordModalOpen.set(true);
  }

  async verifyAdminAndUnlockPassword() {
    if (!this.adminVerifyPassword.trim()) {
      this.adminVerifyError.set('Please enter your administrator password.');
      return;
    }
    this.isVerifyingAdmin = true;
    this.adminVerifyError.set(null);
    try {
      const verified = await this.authService.verifyAdminPassword(this.adminVerifyPassword.trim());
      if (verified) {
        this.isPasswordChangeUnlocked.set(true);
        this.isAdminPasswordModalOpen.set(false);
        this.toastMessage.set('Admin authorization verified. You may now enter a new password.');
      } else {
        this.adminVerifyError.set('Incorrect administrator password.');
      }
    } catch (e: any) {
      this.adminVerifyError.set(e.message || 'Verification failed.');
    } finally {
      this.isVerifyingAdmin = false;
    }
  }

  onOfficerPhoneChange(val: string) {
    this.newOfficer.phone = val;
  }

  isNameNumericInvalid(val: string): boolean {
    if (!val.trim()) return false;
    return /\d/.test(val);
  }

  isEmailValid(val: string): boolean {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val.trim());
  }

  isPhoneTextInvalid(val: string): boolean {
    return isPhoneTextInvalid(val);
  }

  promptSaveOfficer() {
    this.hasSubmitted.set(true);

    if (!this.newOfficer.name.trim() || !this.newOfficer.email.trim()) {
      this.toastMessage.set('Please fill out all required fields.');
      return;
    }

    if (this.isNameNumericInvalid(this.newOfficer.name)) {
      this.toastMessage.set('Names can not be in number');
      return;
    }

    if (!this.isEmailValid(this.newOfficer.email)) {
      this.toastMessage.set('Invalid email format. Please enter a valid officer email address (e.g. officer@sikkim.gov.in).');
      return;
    }

    if (this.newOfficer.phone.trim() && this.isPhoneTextInvalid(this.newOfficer.phone)) {
      this.toastMessage.set('Enter phone number');
      return;
    }

    // Password validation
    if (!this.editingOfficerId()) {
      // New registration requires password
      if (!this.newOfficer.password.trim() || !this.newOfficer.confirmPassword.trim()) {
        this.toastMessage.set('Password is required for new registration.');
        return;
      }
      if (this.newOfficer.password !== this.newOfficer.confirmPassword) {
        this.toastMessage.set('Passwords do not match. Please verify.');
        return;
      }
    } else if (this.isPasswordChangeUnlocked() && this.newOfficer.password.trim()) {
      if (this.newOfficer.password !== this.newOfficer.confirmPassword) {
        this.toastMessage.set('Passwords do not match. Please verify.');
        return;
      }
    }

    if (this.editingOfficerId()) {
      // Prompt confirmation before saving edits
      this.confirmationModal.set({
        title: 'Save Changes Confirmation',
        message: `Are you sure you want to save these changes for officer "${this.newOfficer.name}"?`,
        confirmBtnText: 'Yes, Save Changes',
        isDestructive: false,
        action: async () => { await this.executeSaveOfficer(); }
      });
    } else {
      this.executeSaveOfficer();
    }
  }

  async executeSaveOfficer() {
    const isUnassigned = !this.newOfficer.departmentId || this.newOfficer.departmentId === 'unassigned' || this.newOfficer.departmentId === '';
    const dept = isUnassigned ? null : this.departmentService.departments().find(d => d.id === this.newOfficer.departmentId);
    const deptId = dept ? dept.id : '';
    const deptName = dept ? dept.name : 'Unassigned';
    const formattedPhone = formatPhoneNumber(this.newOfficer.phone);

    try {
      if (this.editingOfficerId()) {
        // Edit mode
        const updatePayload: any = {
          name: this.newOfficer.name.trim(),
          email: this.newOfficer.email.trim(),
          departmentId: deptId,
          departmentName: deptName,
          phone: formattedPhone
        };

        if (this.isPasswordChangeUnlocked() && this.newOfficer.password.trim()) {
          updatePayload.password = this.newOfficer.password.trim();
        }

        await this.authService.updateOfficerByAdmin(this.editingOfficerId()!, updatePayload);
        await this.departmentService.loadDepartmentsFromBackend();
        this.toastMessage.set(`Officer details updated successfully for "${this.newOfficer.name}".`);
      } else {
        // Create mode
        await this.authService.registerOfficerByAdmin({
          name: this.newOfficer.name.trim(),
          email: this.newOfficer.email.trim(),
          password: this.newOfficer.password.trim(),
          designation: 'Officer',
          departmentId: deptId,
          departmentName: deptName,
          phone: formattedPhone
        });

        await this.departmentService.loadDepartmentsFromBackend();
        this.toastMessage.set(`Officer "${this.newOfficer.name}" registered successfully! Access granted.`);
      }

      this.isModalOpen.set(false);
      this.editingOfficerId.set(null);
      this.newOfficer = { name: '', email: '', password: '', confirmPassword: '', departmentId: '', phone: '', designation: '' };
    } catch (err: any) {
      this.toastMessage.set(err.message || 'Action failed.');
    }
  }

  confirmRevoke(off: RegisteredOfficer) {
    this.confirmationModal.set({
      title: 'Revoke Officer Access',
      message: `Are you sure you want to revoke access for officer "${off.name}"? Website access will be disabled, and unsolved cases will be redistributed to departmental peers.`,
      confirmBtnText: 'Yes, Revoke Access',
      isDestructive: true,
      action: async () => {
        await this.authService.revokeOfficerAccess(off.id);
        await this.departmentService.loadDepartmentsFromBackend();
        this.toastMessage.set(`Officer access revoked for "${off.name}". Credentials disabled.`);
      }
    });
  }

  confirmUnrevoke(off: RegisteredOfficer) {
    this.confirmationModal.set({
      title: 'Restore Officer Access',
      message: `Are you sure you want to restore access for officer "${off.name}"? Credentials will be re-enabled.`,
      confirmBtnText: 'Yes, Restore Access',
      isDestructive: false,
      action: async () => {
        await this.authService.restoreOfficerAccess(off.id);
        await this.departmentService.loadDepartmentsFromBackend();
        this.toastMessage.set(`Officer "${off.name}" unrevoked successfully! Access restored.`);
      }
    });
  }

  confirmDelete(off: RegisteredOfficer) {
    this.confirmationModal.set({
      title: 'Delete Officer Permanently',
      message: `Are you sure you want to permanently delete officer "${off.name}"? This action cannot be undone.`,
      confirmBtnText: 'Yes, Delete Permanently',
      isDestructive: true,
      action: async () => {
        await this.authService.removeOfficerByAdmin(off.id);
        await this.departmentService.loadDepartmentsFromBackend();
        this.toastMessage.set(`Officer account permanently deleted for "${off.name}".`);
      }
    });
  }

  async executeConfirmedAction() {
    const modal = this.confirmationModal();
    this.confirmationModal.set(null);
    if (modal && modal.action) {
      await modal.action();
    }
  }
}
