import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { GrievanceService } from '../../core/services/grievance.service';
import { DepartmentService } from '../../core/services/department.service';
import { ReportsService } from '../../core/services/reports.service';
import { ToastComponent } from '../../common/components/toast.component';
import { Grievance } from '../../core/models/complaint.model';
import { formatPhoneNumber, isPhoneTextInvalid } from '../../core/models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in text-slate-900">
      
      <!-- Top Banner Profile Header Card -->
      <div class="bg-gradient-to-r from-[#0F172A] via-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div class="flex items-center space-x-4">
            <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-lg border-2 border-teal-400">
              {{ user()?.displayName?.charAt(0) || 'U' }}
            </div>
            <div>
              <div class="flex items-center space-x-2">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                  [ngClass]="{
                    'bg-amber-400 text-slate-950': user()?.role === 'citizen',
                    'bg-blue-400 text-slate-950': user()?.role === 'officer',
                    'bg-purple-400 text-slate-950': user()?.role === 'admin'
                  }">
                  {{ getRoleBadgeLabel() }}
                </span>
                <span class="text-xs text-slate-300 font-mono">{{ user()?.uid }}</span>
              </div>
              <h1 class="text-xl sm:text-3xl font-extrabold text-white mt-1">{{ user()?.displayName }}</h1>
              <p class="text-xs sm:text-sm text-slate-300">{{ user()?.email }} • {{ user()?.phoneNumber || 'No phone' }}</p>
            </div>
          </div>

          <div class="flex items-center space-x-3">
            <button 
              (click)="activeTab = 'overview'"
              [class.bg-teal-600]="activeTab === 'overview'"
              [class.bg-slate-800]="activeTab !== 'overview'"
              class="px-4 py-2.5 rounded-xl text-xs font-bold text-white transition hover:bg-teal-700 shadow-md">
              Overview & Analytics
            </button>
            <button 
              (click)="activeTab = 'settings'"
              [class.bg-teal-600]="activeTab === 'settings'"
              [class.bg-slate-800]="activeTab !== 'settings'"
              class="px-4 py-2.5 rounded-xl text-xs font-bold text-white transition hover:bg-teal-700 shadow-md">
              Edit Details & Password
            </button>
          </div>
        </div>
      </div>

      <!-- Overview Tab View -->
      <div *ngIf="activeTab === 'overview'" class="space-y-8">

        <!-- Role 1: TOURIST PROFILE STATISTICS -->
        <div *ngIf="authService.isCitizen()" class="space-y-8">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
              <span class="text-slate-400 font-bold text-xs uppercase">Total Filed Grievances</span>
              <div class="text-3xl font-black text-slate-900">{{ citizenMetrics().filed }}</div>
              <p class="text-[11px] text-slate-500">Complaints registered by you</p>
            </div>

            <div class="bg-white p-6 rounded-3xl border border-emerald-200 bg-emerald-50/40 shadow-sm space-y-2">
              <span class="text-emerald-700 font-bold text-xs uppercase">Solved Grievances</span>
              <div class="text-3xl font-black text-emerald-800">{{ citizenMetrics().solved }}</div>
              <p class="text-[11px] text-emerald-600 font-medium">Successfully resolved & closed</p>
            </div>

            <div class="bg-white p-6 rounded-3xl border border-rose-200 bg-rose-50/40 shadow-sm space-y-2">
              <span class="text-rose-700 font-bold text-xs uppercase">Reopened Grievances</span>
              <div class="text-3xl font-black text-rose-800">{{ citizenMetrics().reopened }}</div>
              <p class="text-[11px] text-rose-600 font-medium">Re-submitted for investigation</p>
            </div>
          </div>

          <!-- Solved Grievances & Attached Documents Section -->
          <div class="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div class="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 class="font-extrabold text-slate-900 text-lg">Solved Grievances & Officer Attachment Proof</h3>
                <p class="text-xs text-slate-500">Official resolution reports and proof documents attached by department officers</p>
              </div>
              <span class="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl">{{ citizenSolvedGrievances().length }} Solved</span>
            </div>

            <div *ngIf="citizenSolvedGrievances().length === 0" class="p-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-2xl">
              No solved grievances found yet. When officers resolve your filed complaints, uploaded resolution documents will appear here.
            </div>

            <div *ngFor="let g of citizenSolvedGrievances()" class="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
              <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                <div class="flex items-center space-x-2">
                  <span class="font-mono text-xs font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded">{{ g.trackingCode }}</span>
                  <span class="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase rounded-full">Solved</span>
                  <span *ngIf="g.isEscalated" class="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-extrabold uppercase rounded">Escalated</span>
                </div>
                <span class="text-xs text-slate-500 font-bold">Resolved on {{ g.resolvedAt | date:'dd/MM/yyyy' }}</span>
              </div>

              <div>
                <h4 class="font-bold text-sm text-slate-900">{{ g.title }}</h4>
                <p class="text-xs text-slate-600 mt-1">Department: <strong class="text-teal-800">{{ g.departmentName || g.category }}</strong> | Officer: {{ g.assignedOfficerName || 'Assigned Officer' }}</p>
              </div>

              <!-- Officer Resolution Summary Text -->
              <div *ngIf="g.resolutionDetails" class="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 text-xs text-emerald-950">
                <strong class="font-bold block text-emerald-900 mb-1">Official Resolution Report:</strong>
                <p class="whitespace-pre-line leading-relaxed">{{ g.resolutionDetails }}</p>
              </div>

              <!-- Attached Officer Resolution Files -->
              <div *ngIf="g.resolutionAttachments && g.resolutionAttachments.length > 0" class="pt-2">
                <p class="text-xs font-bold text-slate-700 uppercase mb-2">Attached Officer Resolution Proof Files:</p>
                <div class="flex flex-wrap gap-2">
                  <a *ngFor="let resAtt of g.resolutionAttachments" [href]="resAtt.url" target="_blank" class="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center space-x-2 hover:bg-emerald-100 transition shadow-xs">
                    <span>{{ resAtt.name }}</span>
                    <span *ngIf="resAtt.size" class="text-[10px] text-emerald-600 font-medium">({{ resAtt.size }})</span>
                  </a>
                </div>
              </div>

              <!-- Original Evidence Files -->
              <div *ngIf="g.attachments && g.attachments.length > 0" class="pt-1">
                <p class="text-[11px] font-bold text-slate-500 uppercase mb-1">Your Submitted Complaint Evidence:</p>
                <div class="flex flex-wrap gap-2">
                  <a *ngFor="let att of g.attachments" [href]="att.url" target="_blank" class="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700 hover:bg-slate-100">
                    <span>{{ att.name }}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Role 2: OFFICER PROFILE STATISTICS -->
        <div *ngIf="authService.isOfficer()" class="space-y-8">
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-6">
            <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
              <span class="text-slate-400 font-bold text-xs uppercase">Assigned Grievances</span>
              <div class="text-3xl font-black text-slate-900">{{ officerMetrics().assigned }}</div>
              <p class="text-[11px] text-slate-500">Allocated to your desk</p>
            </div>

            <div class="bg-white p-6 rounded-3xl border border-amber-200 bg-amber-50/40 shadow-sm space-y-2">
              <span class="text-amber-700 font-bold text-xs uppercase">Pending Grievances</span>
              <div class="text-3xl font-black text-amber-800">{{ officerMetrics().pending }}</div>
              <p class="text-[11px] text-amber-600 font-medium">Under active investigation</p>
            </div>

            <div class="bg-white p-6 rounded-3xl border border-rose-200 bg-rose-50/40 shadow-sm space-y-2">
              <span class="text-rose-700 font-bold text-xs uppercase">Reopened Grievances</span>
              <div class="text-3xl font-black text-rose-800">{{ officerMetrics().reopened }}</div>
              <p class="text-[11px] text-rose-600 font-medium">Requires re-investigation</p>
            </div>

            <div class="bg-white p-6 rounded-3xl border border-emerald-200 bg-emerald-50/40 shadow-sm space-y-2">
              <span class="text-emerald-700 font-bold text-xs uppercase">Solved Grievances</span>
              <div class="text-3xl font-black text-emerald-800">{{ officerMetrics().solved }}</div>
              <p class="text-[11px] text-emerald-600 font-medium">Resolved by you</p>
            </div>
          </div>

          <!-- Officer Department Info Card -->
          <div class="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 class="font-extrabold text-slate-900 text-lg border-b pb-3">Department & Official Assignment Details</h3>
            <div class="grid sm:grid-cols-2 gap-4 text-xs">
              <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span class="text-slate-400 font-bold block mb-1">Assigned Department</span>
                <span class="font-bold text-teal-800 text-sm">{{ user()?.departmentName || 'Transport & Mobility Cell' }}</span>
              </div>
              <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span class="text-slate-400 font-bold block mb-1">Officer Designation</span>
                <span class="font-bold text-slate-900 text-sm">{{ user()?.designation || 'Officer' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Role 3: ADMIN PROFILE STATISTICS -->
        <div *ngIf="authService.isAdmin()" class="space-y-8">
          <div class="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
              <span class="text-slate-400 font-bold text-[11px] uppercase">Assigned</span>
              <div class="text-2xl font-black text-slate-900">{{ adminMetrics().assigned }}</div>
            </div>

            <div class="bg-white p-5 rounded-3xl border border-amber-200 bg-amber-50/40 shadow-sm space-y-2">
              <span class="text-amber-700 font-bold text-[11px] uppercase">Pending</span>
              <div class="text-2xl font-black text-amber-800">{{ adminMetrics().pending }}</div>
            </div>

            <div class="bg-white p-5 rounded-3xl border border-emerald-200 bg-emerald-50/40 shadow-sm space-y-2">
              <span class="text-emerald-700 font-bold text-[11px] uppercase">Solved</span>
              <div class="text-2xl font-black text-emerald-800">{{ adminMetrics().solved }}</div>
            </div>

            <div class="bg-white p-5 rounded-3xl border border-rose-200 bg-rose-50/40 shadow-sm space-y-2">
              <span class="text-rose-700 font-bold text-[11px] uppercase">Reopened</span>
              <div class="text-2xl font-black text-rose-800">{{ adminMetrics().reopened }}</div>
            </div>

            <div class="bg-white p-5 rounded-3xl border border-purple-200 bg-purple-50/40 shadow-sm space-y-2">
              <span class="text-purple-700 font-bold text-[11px] uppercase">Unassigned</span>
              <div class="text-2xl font-black text-purple-800">{{ adminMetrics().unassigned }}</div>
            </div>
          </div>

          <!-- Roster Overview Card -->
          <div class="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 class="font-extrabold text-slate-900 text-lg border-b pb-3">System Roster Overview</h3>
            <div class="grid sm:grid-cols-3 gap-4 text-xs">
              <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span class="text-slate-400 font-bold">Registered Tourists</span>
                <p class="text-2xl font-black text-slate-900">{{ authService.registeredCitizens().length }}</p>
              </div>
              <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span class="text-slate-400 font-bold">Registered Officers</span>
                <p class="text-2xl font-black text-slate-900">{{ authService.registeredOfficers().length }}</p>
              </div>
              <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span class="text-slate-400 font-bold">Active Departments</span>
                <p class="text-2xl font-black text-slate-900">{{ departmentService.departments().length }}</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Settings Tab View: EDIT DETAILS & INTEGRATED PASSWORD CHANGE -->
      <div *ngIf="activeTab === 'settings'" class="max-w-2xl mx-auto w-full">
        
        <div class="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div class="border-b pb-3">
            <h3 class="font-extrabold text-slate-900 text-lg">Edit Personal Information</h3>
            <p class="text-xs text-slate-500">Update your account full name, email address, phone number, or password</p>
          </div>

          <form (submit)="saveProfileDetails()" class="space-y-5">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name *</label>
              <input 
                type="text" 
                [(ngModel)]="editForm.name" 
                name="profile_name"
                class="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#A0C8C3] focus:outline-none"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address *</label>
              <input 
                type="email" 
                [(ngModel)]="editForm.email" 
                name="profile_email"
                class="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#A0C8C3] focus:outline-none"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Contact Phone Number *</label>
              <input 
                type="text" 
                [(ngModel)]="editForm.phone" 
                (ngModelChange)="onPhoneChange($event)"
                name="profile_phone"
                placeholder="+91 98765 43210"
                class="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#A0C8C3] focus:outline-none"
              />
              <p *ngIf="isPhoneInvalid()" class="text-[11px] text-rose-600 font-bold mt-1">Enter phone number</p>
            </div>

            <!-- Integrated Change Password Section -->
            <div class="pt-4 border-t border-slate-100 space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="font-bold text-xs text-slate-800 uppercase">Change Account Password</h4>
                  <p class="text-[11px] text-slate-500">First enter your previous password to unlock new password inputs</p>
                </div>
                <button 
                  type="button" 
                  (click)="toggleChangePassword()"
                  class="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition border border-slate-200">
                  {{ isChangingPassword ? 'Cancel Password Change' : 'Change Password' }}
                </button>
              </div>

              <!-- When Change Password is clicked -->
              <div *ngIf="isChangingPassword" class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 animate-fade-in">
                
                <!-- STEP 1: Enter Previous Password -->
                <div>
                  <label class="block text-xs font-bold text-slate-700 uppercase mb-1">1. Enter Previous Password *</label>
                  <div class="flex space-x-2">
                    <div class="relative flex-1">
                      <input 
                        [type]="showPreviousPassword() ? 'text' : 'password'" 
                        [(ngModel)]="previousPassword" 
                        (ngModelChange)="onPreviousPasswordInput($event)"
                        name="prev_pass_input"
                        placeholder="Enter your current registered password"
                        class="w-full px-4 py-2.5 pr-12 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#A0C8C3] focus:outline-none"
                      />
                      <button 
                        type="button" 
                        (click)="showPreviousPassword.set(!showPreviousPassword())"
                        aria-label="Toggle previous password visibility"
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1 focus:outline-none"
                      >
                        {{ showPreviousPassword() ? 'Hide' : 'Show' }}
                      </button>
                    </div>
                    <button 
                      type="button" 
                      (click)="verifyPreviousPassword()"
                      class="px-4 py-2.5 bg-teal-700 text-white rounded-xl text-xs font-bold hover:bg-teal-800 shrink-0">
                      Verify
                    </button>
                  </div>
                  <p *ngIf="previousPasswordError" class="text-[11px] text-rose-600 font-bold mt-1">
                    {{ previousPasswordError }}
                  </p>
                  <p *ngIf="isPreviousPasswordVerified" class="text-[11px] text-emerald-700 font-bold mt-1">
                    ✓ Previous password verified successfully! New password fields unlocked below.
                  </p>
                </div>

                <!-- STEP 2: Only appears ONCE Previous Password is verified -->
                <div *ngIf="isPreviousPasswordVerified" class="space-y-3 pt-2 border-t border-slate-200 animate-fade-in">
                  <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase mb-1">2. New Password *</label>
                    <div class="relative">
                      <input 
                        [type]="showNewPassword() ? 'text' : 'password'" 
                        [(ngModel)]="newPassword" 
                        name="new_pass_input"
                        placeholder="Enter new password (min 6 characters)"
                        class="w-full px-4 py-2.5 pr-12 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#A0C8C3] focus:outline-none"
                      />
                      <button 
                        type="button" 
                        (click)="showNewPassword.set(!showNewPassword())"
                        aria-label="Toggle new password visibility"
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1 focus:outline-none"
                      >
                        {{ showNewPassword() ? 'Hide' : 'Show' }}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase mb-1">3. Confirm New Password *</label>
                    <div class="relative">
                      <input 
                        [type]="showConfirmPassword() ? 'text' : 'password'" 
                        [(ngModel)]="confirmPassword" 
                        name="confirm_pass_input"
                        placeholder="Re-enter new password"
                        class="w-full px-4 py-2.5 pr-12 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#A0C8C3] focus:outline-none"
                      />
                      <button 
                        type="button" 
                        (click)="showConfirmPassword.set(!showConfirmPassword())"
                        aria-label="Toggle confirm new password visibility"
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1 focus:outline-none"
                      >
                        {{ showConfirmPassword() ? 'Hide' : 'Show' }}
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <button type="submit" class="w-full bg-[#0F172A] text-white py-3 rounded-xl font-bold text-xs hover:bg-slate-800 transition shadow-md">
              Save Profile Changes
            </button>
          </form>
        </div>

      </div>

      <app-toast [message]="toastMessage()" (dismiss)="toastMessage.set(null)"></app-toast>

    </div>
  `
})
export class ProfileComponent {
  authService = inject(AuthService);
  grievanceService = inject(GrievanceService);
  departmentService = inject(DepartmentService);
  reportsService = inject(ReportsService);

  activeTab: 'overview' | 'settings' = 'overview';
  toastMessage = signal<string | null>(null);

  user = () => this.authService.currentUser();

  editForm = {
    name: this.user()?.displayName || '',
    email: this.user()?.email || '',
    phone: this.user()?.phoneNumber || ''
  };

  isChangingPassword = false;
  previousPassword = '';
  isPreviousPasswordVerified = false;
  previousPasswordError = '';
  newPassword = '';
  confirmPassword = '';

  showPreviousPassword = signal<boolean>(false);
  showNewPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);

  toggleChangePassword() {
    this.isChangingPassword = !this.isChangingPassword;
    this.previousPassword = '';
    this.isPreviousPasswordVerified = false;
    this.previousPasswordError = '';
    this.newPassword = '';
    this.confirmPassword = '';
  }

  onPreviousPasswordInput(val: string) {
    this.previousPassword = val;
    this.isPreviousPasswordVerified = false;
    this.previousPasswordError = '';
  }

  verifyPreviousPassword(): boolean {
    if (!this.previousPassword.trim()) {
      this.previousPasswordError = 'Please enter your previous password.';
      this.isPreviousPasswordVerified = false;
      return false;
    }

    const isValid = this.authService.verifyCurrentPassword(this.previousPassword);
    if (isValid) {
      this.isPreviousPasswordVerified = true;
      this.previousPasswordError = '';
      return true;
    } else {
      this.isPreviousPasswordVerified = false;
      this.previousPasswordError = 'Previous password does not match your current registered password.';
      return false;
    }
  }

  getRoleBadgeLabel(): string {
    const r = this.user()?.role;
    if (r === 'citizen') return 'Tourist';
    if (r === 'officer') return 'Officer';
    if (r === 'admin') return 'Administrator';
    return 'User';
  }

  onPhoneChange(val: string) {
    this.editForm.phone = val;
  }

  isPhoneInvalid(): boolean {
    return isPhoneTextInvalid(this.editForm.phone);
  }

  isEmailValid(val: string): boolean {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val.trim());
  }

  // Tourist metrics & grievances
  citizenMetrics = computed(() => {
    const u = this.user();
    if (!u || u.role !== 'citizen') return { filed: 0, solved: 0, reopened: 0 };
    const cleanEmail = u.email.toLowerCase().trim();
    const myGrievances = this.grievanceService.grievances().filter(g =>
      (g.citizenEmail && g.citizenEmail.toLowerCase().trim() === cleanEmail) ||
      (g.citizenId && g.citizenId === u.uid)
    );

    return {
      filed: myGrievances.length,
      solved: myGrievances.filter(g => g.status === 'resolved' || g.status === 'closed').length,
      reopened: myGrievances.filter(g => g.status === 'reopened').length
    };
  });

  citizenSolvedGrievances = computed(() => {
    const u = this.user();
    if (!u || u.role !== 'citizen') return [];
    const cleanEmail = u.email.toLowerCase().trim();
    return this.grievanceService.grievances().filter(g =>
      ((g.citizenEmail && g.citizenEmail.toLowerCase().trim() === cleanEmail) || (g.citizenId && g.citizenId === u.uid)) &&
      (g.status === 'resolved' || g.status === 'closed')
    );
  });

  // Officer metrics
  officerMetrics = computed(() => {
    const u = this.user();
    if (!u || u.role !== 'officer') return { assigned: 0, pending: 0, reopened: 0, solved: 0 };
    const cleanEmail = u.email.toLowerCase().trim();
    const myAssigned = this.grievanceService.grievances().filter(g =>
      g.assignedOfficerId === u.uid ||
      (g.assignedOfficerId && g.assignedOfficerId.toLowerCase().trim() === cleanEmail) ||
      (g.assignedOfficerName && g.assignedOfficerName.toLowerCase().trim() === u.displayName.toLowerCase().trim())
    );

    return {
      assigned: myAssigned.length,
      pending: myAssigned.filter(g => g.status === 'assigned' || g.status === 'in_progress').length,
      reopened: myAssigned.filter(g => g.status === 'reopened').length,
      solved: myAssigned.filter(g => g.status === 'resolved' || g.status === 'closed').length
    };
  });

  // Admin metrics
  adminMetrics = computed(() => {
    const all = this.grievanceService.grievances();
    const depts = this.departmentService.departments();
    const registeredOfficers = this.authService.registeredOfficers();
    const activeOfficers = registeredOfficers.filter(o => !o.isRevoked);

    const unassigned = all.filter(g => {
      if (g.status === 'resolved' || g.status === 'closed') return false;
      const deptName = g.departmentName || g.category;
      const targetDept = depts.find(d => d.id === g.departmentId || (deptName && d.name.toLowerCase().trim() === deptName.toLowerCase().trim()));
      if (!targetDept || !targetDept.isActive) return true;
      const deptActive = activeOfficers.filter(o => o.departmentId === targetDept.id || (o.departmentName && o.departmentName.toLowerCase().trim() === targetDept.name.toLowerCase().trim()));
      if (deptActive.length === 0 || !g.assignedOfficerId) return true;
      const assignedOff = registeredOfficers.find(o => o.id === g.assignedOfficerId || o.email.toLowerCase().trim() === (g.assignedOfficerId || '').toLowerCase().trim());
      return !assignedOff || assignedOff.isRevoked;
    });

    return {
      assigned: all.filter(g => !!g.assignedOfficerId && g.status !== 'submitted').length,
      pending: all.filter(g => g.status === 'assigned' || g.status === 'in_progress').length,
      solved: all.filter(g => g.status === 'resolved' || g.status === 'closed').length,
      reopened: all.filter(g => g.status === 'reopened').length,
      unassigned: unassigned.length
    };
  });

  async saveProfileDetails() {
    if (!this.editForm.name.trim() || !this.editForm.email.trim() || !this.editForm.phone.trim()) {
      this.toastMessage.set('Please fill out all required profile fields.');
      return;
    }

    if (!this.isEmailValid(this.editForm.email)) {
      this.toastMessage.set('Please enter a valid email address.');
      return;
    }

    if (this.isPhoneInvalid()) {
      this.toastMessage.set('Enter phone number');
      return;
    }

    if (this.isChangingPassword) {
      if (!this.isPreviousPasswordVerified) {
        if (!this.verifyPreviousPassword()) {
          this.toastMessage.set('Please enter and verify your valid previous password first.');
          return;
        }
      }

      if (!this.newPassword || !this.confirmPassword) {
        this.toastMessage.set('Please enter both new password and confirm new password.');
        return;
      }

      if (this.newPassword.length < 6) {
        this.toastMessage.set('New password must be at least 6 characters long.');
        return;
      }

      if (this.newPassword !== this.confirmPassword) {
        this.toastMessage.set('New password and confirm new password do not match.');
        return;
      }

      try {
        await this.authService.changeUserPassword(this.previousPassword, this.newPassword);
      } catch (err: any) {
        this.toastMessage.set(err.message || 'Password update failed.');
        return;
      }
    }

    try {
      const formattedPhone = formatPhoneNumber(this.editForm.phone);
      await this.authService.updateUserProfile(this.editForm.name, this.editForm.email, formattedPhone);
      this.toastMessage.set(this.isChangingPassword ? 'Profile details and password updated successfully!' : 'Profile details updated successfully!');
      if (this.isChangingPassword) {
        this.toggleChangePassword();
      }
    } catch (err: any) {
      this.toastMessage.set(err.message || 'Failed to update profile.');
    }
  }
}
