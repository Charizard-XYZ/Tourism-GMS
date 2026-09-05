import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { GrievanceService } from '../../core/services/grievance.service';
import { DepartmentService } from '../../core/services/department.service';
import { ReportsService } from '../../core/services/reports.service';
import { ToastComponent } from '../../common/components/toast.component';
import { Grievance } from '../../core/models/complaint.model';
import { formatPhoneNumber, isPhoneTextInvalid } from '../../core/models/user.model';
import { capitalizeFirstChar } from '../../core/directives/capitalize-first.directive';

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
                    'bg-amber-400 text-slate-950': user()?.role === 'tourist',
                    'bg-blue-400 text-slate-950': user()?.role === 'officer',
                    'bg-purple-400 text-slate-950': user()?.role === 'admin'
                  }">
                  {{ getRoleBadgeLabel() }}
                </span>
                <span *ngIf="user()?.userCode" class="px-2.5 py-0.5 bg-teal-400/20 text-teal-300 font-mono text-xs font-bold rounded-md">
                  {{ user()?.userCode }}
                </span>
              </div>
              <h1 class="text-xl sm:text-3xl font-extrabold text-white mt-1">{{ user()?.displayName }}</h1>
              <p class="text-xs sm:text-sm text-slate-300">{{ user()?.email }} • {{ user()?.phoneNumber || 'No phone' }}</p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button 
              (click)="switchTab('overview')"
              [class.bg-teal-600]="activeTab === 'overview'"
              [class.bg-slate-800]="activeTab !== 'overview'"
              class="px-4 py-2.5 rounded-xl text-xs font-bold text-white transition hover:bg-teal-700 shadow-md">
              Overview & Analytics
            </button>
            <button 
              (click)="switchTab('settings')"
              [class.bg-teal-600]="activeTab === 'settings'"
              [class.bg-slate-800]="activeTab !== 'settings'"
              class="px-4 py-2.5 rounded-xl text-xs font-bold text-white transition hover:bg-teal-700 shadow-md">
              Edit Details & Password
            </button>
            <button 
              (click)="confirmLogout()"
              title="Log out of account"
              class="px-4 py-2.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center space-x-1.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Overview Tab View -->
      <div *ngIf="activeTab === 'overview'" class="space-y-8">

        <!-- Role 1: TOURIST PROFILE STATISTICS -->
        <div *ngIf="authService.isTourist()" class="space-y-8">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
              <span class="text-slate-400 font-bold text-xs uppercase">Total Filed Grievances</span>
              <div class="text-3xl font-black text-slate-900">{{ touristMetrics().filed }}</div>
              <p class="text-[11px] text-slate-500">Complaints registered by you</p>
            </div>

            <div class="bg-white p-6 rounded-3xl border border-emerald-200 bg-emerald-50/40 shadow-sm space-y-2">
              <span class="text-emerald-700 font-bold text-xs uppercase">Solved Grievances</span>
              <div class="text-3xl font-black text-emerald-800">{{ touristMetrics().solved }}</div>
              <p class="text-[11px] text-emerald-600 font-medium">Successfully resolved & closed</p>
            </div>

            <div class="bg-white p-6 rounded-3xl border border-rose-200 bg-rose-50/40 shadow-sm space-y-2">
              <span class="text-rose-700 font-bold text-xs uppercase">Reopened Grievances</span>
              <div class="text-3xl font-black text-rose-800">{{ touristMetrics().reopened }}</div>
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
              <span class="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl">{{ touristSolvedGrievances().length }} Solved</span>
            </div>

            <div *ngIf="touristSolvedGrievances().length === 0" class="p-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-2xl">
              No solved grievances found yet. When officers resolve your filed complaints, uploaded resolution documents will appear here.
            </div>

            <div *ngFor="let g of touristSolvedGrievances()" class="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
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

        <!-- Role 3: ADMIN PROFILE -->
        <div *ngIf="authService.isAdmin()" class="space-y-8">
          <!-- Roster Overview Card -->
          <div class="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 class="font-extrabold text-slate-900 text-lg border-b pb-3">System Roster Overview</h3>
            <div class="grid sm:grid-cols-3 gap-4 text-xs">
              <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span class="text-slate-400 font-bold">Registered Tourists</span>
                <p class="text-2xl font-black text-slate-900">{{ authService.registeredTourists().length }}</p>
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

        <!-- Grievance Overview Card below User Details for All Roles -->
        <div class="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
              <div>
                <h3 class="font-extrabold text-slate-900 text-lg">Grievance Overview</h3>
                <p class="text-xs text-slate-500">Live operational status and recent activity across your tickets</p>
              </div>
              <span class="px-3 py-1 bg-teal-50 text-teal-800 text-xs font-bold rounded-xl self-start sm:self-auto">
                {{ userGrievanceList().length }} Total Records
              </span>
            </div>

            <!-- Role-based status breakdown cards -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span class="text-[10px] font-extrabold text-slate-500 uppercase">Assigned / Active</span>
                <p class="text-2xl font-black text-slate-900">{{ grievanceOverviewStats().active }}</p>
              </div>
              <div class="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-1">
                <span class="text-[10px] font-extrabold text-amber-700 uppercase">In Investigation</span>
                <p class="text-2xl font-black text-amber-800">{{ grievanceOverviewStats().inProgress }}</p>
              </div>
              <div class="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-1">
                <span class="text-[10px] font-extrabold text-emerald-700 uppercase">Resolved / Closed</span>
                <p class="text-2xl font-black text-emerald-800">{{ grievanceOverviewStats().resolved }}</p>
              </div>
              <div class="p-4 bg-rose-50/60 rounded-2xl border border-rose-200 space-y-1">
                <span class="text-[10px] font-extrabold text-rose-700 uppercase">Reopened / Escalated</span>
                <p class="text-2xl font-black text-rose-800">{{ grievanceOverviewStats().reopened }}</p>
              </div>
            </div>

            <!-- Recent Grievance Activity Log -->
            <div class="space-y-3">
              <h4 class="font-bold text-xs uppercase tracking-wider text-slate-700">Recent Grievance Logs</h4>
              <div *ngIf="userGrievanceList().length === 0" class="p-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-2xl">
                No grievance activity records found for this account.
              </div>
              <div *ngIf="userGrievanceList().length > 0" class="overflow-x-auto border border-slate-200 rounded-2xl">
                <table class="w-full text-left text-xs">
                  <thead class="bg-slate-900 text-white uppercase text-[10px] font-bold">
                    <tr>
                      <th class="p-3">Grievance Code</th>
                      <th class="p-3">Title</th>
                      <th class="p-3">Department</th>
                      <th class="p-3">Date</th>
                      <th class="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 font-medium">
                    <tr *ngFor="let g of userGrievanceList().slice(0, 5)" class="hover:bg-slate-50">
                      <td class="p-3 font-mono font-bold text-teal-800">{{ g.grievanceCode || g.trackingCode }}</td>
                      <td class="p-3 font-bold text-slate-900 truncate max-w-[200px]">{{ g.title }}</td>
                      <td class="p-3 text-slate-600">{{ g.departmentName || g.category }}</td>
                      <td class="p-3 text-slate-500">{{ g.createdAt | date:'dd/MM/yyyy' }}</td>
                      <td class="p-3 text-right">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase"
                          [ngClass]="{
                            'bg-emerald-100 text-emerald-800': g.status === 'resolved' || g.status === 'closed',
                            'bg-amber-100 text-amber-800': g.status === 'in_progress' || g.status === 'assigned',
                            'bg-rose-100 text-rose-800': g.status === 'reopened',
                            'bg-slate-100 text-slate-700': g.status === 'submitted'
                          }">
                          {{ g.status }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

      <!-- Settings Tab View: EDIT DETAILS & INTEGRATED PASSWORD CHANGE -->
      <div *ngIf="activeTab === 'settings'" class="max-w-2xl mx-auto w-full">
        
        <div class="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div class="flex items-center justify-between border-b pb-3">
            <div>
              <h3 class="font-extrabold text-slate-900 text-lg">Edit Personal Information</h3>
              <p class="text-xs text-slate-500">Update your account full name, email address, phone number, or password</p>
            </div>
            <button 
              type="button" 
              (click)="cancelSettings()" 
              class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition">
              Discard Changes
            </button>
          </div>

          <form (submit)="promptSaveProfile()" class="space-y-5">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name *</label>
              <input 
                type="text" 
                [ngModel]="editForm.name" 
                (ngModelChange)="onNameChange($event)"
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
                  <p *ngIf="isPreviousPasswordVerified" class="text-[11px] text-emerald-700 font-bold mt-1 flex items-center space-x-1">
                    <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Previous password verified successfully! New password fields unlocked below.</span>
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

            <div class="flex space-x-3 pt-2">
              <button 
                type="button" 
                (click)="cancelSettings()" 
                class="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold text-xs hover:bg-slate-200 transition">
                Discard Changes
              </button>
              <button 
                type="submit" 
                class="flex-1 bg-[#0F172A] text-white py-3 rounded-xl font-bold text-xs hover:bg-slate-800 transition shadow-md">
                Save Profile Changes
              </button>
            </div>
          </form>
        </div>

      </div>

      <!-- Action Confirmation Dialog -->
      <div *ngIf="confirmationModal()" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
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
              class="flex-1 bg-[#0F172A] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow-sm"
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
export class ProfileComponent {
  authService = inject(AuthService);
  grievanceService = inject(GrievanceService);
  departmentService = inject(DepartmentService);
  reportsService = inject(ReportsService);
  router = inject(Router);

  activeTab: 'overview' | 'settings' = 'overview';
  toastMessage = signal<string | null>(null);

  user = () => this.authService.currentUser();

  editForm = {
    name: this.user()?.displayName || '',
    email: this.user()?.email || '',
    phone: this.user()?.phoneNumber || ''
  };

  onNameChange(val: string) {
    this.editForm.name = capitalizeFirstChar(val);
  }

  resetEditForm() {
    const u = this.user();
    this.editForm = {
      name: u?.displayName || '',
      email: u?.email || '',
      phone: u?.phoneNumber || ''
    };
    this.isChangingPassword = false;
    this.previousPassword = '';
    this.isPreviousPasswordVerified = false;
    this.previousPasswordError = '';
    this.newPassword = '';
    this.confirmPassword = '';
  }

  switchTab(tab: 'overview' | 'settings') {
    if (this.activeTab === 'settings' && tab !== 'settings') {
      // Discard unsaved changes when navigating away from settings
      this.resetEditForm();
    }
    this.activeTab = tab;
  }

  cancelSettings() {
    this.resetEditForm();
    this.activeTab = 'overview';
    this.toastMessage.set('Unsaved profile changes discarded.');
  }

  confirmLogout() {
    this.confirmationModal.set({
      title: 'Confirm Logout',
      message: 'Are you sure you want to log out of your account?',
      confirmBtnText: 'Yes, Logout',
      action: async () => {
        await this.authService.logout();
        this.grievanceService.clearState();
        this.router.navigate(['/'], { replaceUrl: true });
      }
    });
  }

  isChangingPassword = false;
  previousPassword = '';
  isPreviousPasswordVerified = false;
  previousPasswordError = '';
  newPassword = '';
  confirmPassword = '';

  showPreviousPassword = signal<boolean>(false);
  showNewPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);

  constructor() {
    if (this.authService.isAdmin()) {
      this.authService.loadTouristsFromBackend();
    }
  }

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
    if (r === 'tourist') return 'Tourist';
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
  touristMetrics = computed(() => {
    const u = this.user();
    if (!u || u.role !== 'tourist') return { filed: 0, solved: 0, reopened: 0 };
    const cleanEmail = u.email.toLowerCase().trim();
    const myGrievances = this.grievanceService.grievances().filter(g =>
      (g.touristEmail && g.touristEmail.toLowerCase().trim() === cleanEmail) ||
      (g.touristId && g.touristId === u.uid)
    );

    return {
      filed: myGrievances.length,
      solved: myGrievances.filter(g => g.status === 'resolved' || g.status === 'closed').length,
      reopened: myGrievances.filter(g => g.status === 'reopened').length
    };
  });

  touristSolvedGrievances = computed(() => {
    const u = this.user();
    if (!u || u.role !== 'tourist') return [];
    const cleanEmail = u.email.toLowerCase().trim();
    return this.grievanceService.grievances().filter(g =>
      ((g.touristEmail && g.touristEmail.toLowerCase().trim() === cleanEmail) ||
       (g.touristId && g.touristId === u.uid)) &&
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

  // Grievance overview computed properties (applicable to all logged-in roles)
  userGrievanceList = computed(() => {
    const u = this.user();
    if (!u) return [];
    const all = this.grievanceService.grievances();
    if (u.role === 'tourist') {
      const cleanEmail = u.email.toLowerCase().trim();
      return all.filter(g =>
        (g.touristEmail && g.touristEmail.toLowerCase().trim() === cleanEmail) ||
        (g.touristId && g.touristId === u.uid)
      );
    } else if (u.role === 'officer') {
      const cleanEmail = u.email.toLowerCase().trim();
      return all.filter(g =>
        g.assignedOfficerId === u.uid ||
        (g.assignedOfficerId && g.assignedOfficerId.toLowerCase().trim() === cleanEmail) ||
        (g.assignedOfficerName && g.assignedOfficerName.toLowerCase().trim() === u.displayName.toLowerCase().trim())
      );
    } else {
      // Admin: sees recent system grievances
      return all;
    }
  });

  grievanceOverviewStats = computed(() => {
    const list = this.userGrievanceList();
    return {
      active: list.filter(g => g.status === 'assigned' || g.status === 'submitted').length,
      inProgress: list.filter(g => g.status === 'in_progress').length,
      resolved: list.filter(g => g.status === 'resolved' || g.status === 'closed').length,
      reopened: list.filter(g => g.status === 'reopened').length
    };
  });

  confirmationModal = signal<{
    title: string;
    message: string;
    confirmBtnText: string;
    action: () => Promise<void>;
  } | null>(null);

  promptSaveProfile() {
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
    }

    this.confirmationModal.set({
      title: 'Save Profile Changes',
      message: 'Are you sure you want to save these changes?',
      confirmBtnText: 'Yes, Save Changes',
      action: async () => {
        await this.executeSaveProfileDetails();
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

  async executeSaveProfileDetails() {
    if (this.isChangingPassword) {
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
