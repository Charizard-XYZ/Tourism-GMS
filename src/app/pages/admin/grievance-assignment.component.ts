import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GrievanceService } from '../../core/services/grievance.service';
import { DepartmentService } from '../../core/services/department.service';
import { AuthService } from '../../core/services/auth.service';
import { StatusBadgeComponent } from '../../common/components/status-badge.component';
import { ToastComponent } from '../../common/components/toast.component';
import { Grievance } from '../../core/models/complaint.model';

@Component({
  selector: 'app-grievance-assignment',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent, ToastComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      <div class="flex justify-between items-center bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <h1 class="text-2xl font-extrabold">Master Grievance Assignment Desk</h1>
          <p class="text-xs text-[#A0C8C3]">Directorate verification, officer allocation, and executive discussion thread</p>
        </div>
      </div>

      <!-- Search & Redressal Lifecycle Filter Bar -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid sm:grid-cols-3 gap-4">
        <input 
          type="text" 
          [(ngModel)]="searchKeyword" 
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          data-lpignore="true"
          placeholder="Search by Code, Title, Tourist Name..." 
          class="px-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#A0C8C3]"
        />

        <select [(ngModel)]="departmentFilter" class="px-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#A0C8C3]">
          <option value="ALL">All Departments</option>
          <option *ngFor="let d of departmentService.departments()" [value]="d.id">
            {{ d.name }} ({{ d.code }})
          </option>
        </select>

        <select [(ngModel)]="lifecycleFilter" class="px-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#A0C8C3]">
          <option value="ALL">All Redressal Lifecycle</option>
          <option value="submitted">Submitted (Pending Allocation)</option>
          <option value="assigned">Assigned to Officer</option>
          <option value="in_progress">Under Inquiry / In Progress</option>
          <option value="resolved">Resolution Complete</option>
          <option value="closed">Ticket Closed</option>
          <option value="reopened">Escalated / Reopened</option>
        </select>
      </div>

      <!-- Master Grievances Table -->
      <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-900 text-white uppercase text-[10px] font-bold">
            <tr>
              <th class="p-4">Tracking Code</th>
              <th class="p-4">Complaint Title</th>
              <th class="p-4">Category / Department</th>
              <th class="p-4">Assigned Officer</th>
              <th class="p-4">Status & Progress</th>
              <th class="p-4">Progress Tracker</th>
              <th class="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <tr *ngFor="let g of filteredGrievances()" class="hover:bg-slate-50">
              <td class="p-4 font-mono font-bold text-slate-800">{{ g.trackingCode }}</td>
              <td class="p-4 max-w-xs font-bold text-slate-900 truncate">{{ g.title }}</td>
              <td class="p-4">
                <span class="font-bold text-teal-800">{{ g.departmentName || g.category }}</span>
              </td>
              <td class="p-4 text-slate-600">
                <span *ngIf="g.assignedOfficerName" class="font-bold text-slate-900">{{ g.assignedOfficerName }}</span>
                <span *ngIf="!g.assignedOfficerName" class="text-rose-600 font-bold italic">Unassigned</span>
              </td>
              <td class="p-4">
                <app-status-badge [status]="g.status"></app-status-badge>
              </td>
              <td class="p-4">
                <div class="space-y-1">
                  <div class="flex justify-between items-center text-[10px] font-bold text-slate-700">
                    <span>{{ getProgressLabel(g.status) }}</span>
                    <span>{{ getProgressPercentage(g.status) }}%</span>
                  </div>
                  <div class="w-28 bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                    <div [class]="getProgressColorClass(g.status)" class="h-1.5 rounded-full transition-all duration-500" [style.width.%]="getProgressPercentage(g.status)"></div>
                  </div>
                </div>
              </td>
              <td class="p-4 text-right space-x-2">
                <button (click)="openCommentModal(g)" class="px-3 py-1.5 bg-slate-100 text-slate-800 rounded-lg font-bold text-xs hover:bg-slate-200 transition">
                  Comments ({{ grievanceService.getCommentsForGrievance(g.id).length }})
                </button>
                <button (click)="openAssignModal(g)" class="px-3.5 py-1.5 bg-[#A0C8C3] text-slate-950 rounded-lg font-extrabold text-xs hover:bg-teal-300 transition shadow-sm">
                  Assign Officer →
                </button>
              </td>
            </tr>

            <tr *ngIf="filteredGrievances().length === 0">
              <td colspan="7" class="p-8 text-center text-slate-400 italic">
                No grievances match the search, department, or redressal lifecycle filter criteria.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Officer Assignment Modal (Department is pre-chosen by tourist) -->
      <div *ngIf="selectedGrievance" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div class="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
          <div class="flex justify-between items-center border-b pb-3">
            <h3 class="font-bold text-base text-slate-900">Assign Officer</h3>
            <button (click)="selectedGrievance = null" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
          </div>

          <p class="text-xs text-slate-500 font-mono">{{ selectedGrievance.trackingCode }}: {{ selectedGrievance.title }}</p>

          <!-- Dynamic Department Selection Dropdown -->
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Assign Target Department *</label>
            <select [(ngModel)]="targetDeptId" (change)="onDepartmentChange()" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-[#A0C8C3]">
              <option *ngFor="let d of departmentService.departments()" [value]="d.id">
                {{ d.name }} ({{ d.code }})
              </option>
            </select>
          </div>

          <!-- Officer Selection Dropdown -->
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Select Nodal Officer *</label>
            <select [(ngModel)]="targetOfficerId" class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-[#A0C8C3]">
              <option value="">Select an officer to assign...</option>
              <option *ngFor="let off of getOfficersForTargetDept()" [value]="off.id">
                {{ off.name }} ({{ off.email }})
              </option>
            </select>

            <div *ngIf="getOfficersForTargetDept().length === 0" class="mt-2 text-xs text-rose-600 italic p-2 bg-rose-50 rounded-xl">
              No officers registered under this department yet. Please register an officer under this department.
            </div>
          </div>

          <div class="flex space-x-2 pt-2 border-t">
            <button (click)="selectedGrievance = null" class="flex-1 bg-slate-100 py-2.5 rounded-xl text-xs font-bold text-slate-600">Cancel</button>
            <button 
              (click)="confirmAssignment()" 
              [disabled]="!targetOfficerId" 
              class="flex-1 bg-[#0F172A] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition"
            >
              Confirm Officer Assignment
            </button>
          </div>
        </div>
      </div>

      <!-- Admin Grievance Comments & Discussion Modal -->
      <div *ngIf="commentModalGrievance" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div class="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
          <div class="flex justify-between items-center border-b pb-3">
            <div>
              <span class="text-[10px] font-mono font-bold text-slate-500">{{ commentModalGrievance.trackingCode }}</span>
              <h3 class="font-bold text-base text-slate-900">Admin Case Discussion & Comments</h3>
            </div>
            <button (click)="commentModalGrievance = null" class="text-slate-400 hover:text-slate-600 font-bold text-xl">✕</button>
          </div>

          <p class="text-xs text-slate-700 font-semibold bg-slate-50 p-3 rounded-xl border border-slate-100">
            {{ commentModalGrievance.title }}
          </p>

          <!-- Comment List -->
          <div class="space-y-3 max-h-60 overflow-y-auto pr-1">
            <div *ngFor="let c of grievanceService.getCommentsForGrievance(commentModalGrievance.id)" class="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div class="flex justify-between items-center">
                <span class="font-bold text-slate-900">{{ c.userName }}</span>
                <div class="flex items-center space-x-1.5">
                  <span *ngIf="c.isInternalOnly" class="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-extrabold uppercase rounded">Internal Note</span>
                  <span class="text-[10px] text-slate-400">{{ c.createdAt | date:'dd/MM/yyyy, hh:mm a' }}</span>
                </div>
              </div>
              <p class="text-slate-700 leading-snug">{{ c.commentText }}</p>
            </div>

            <div *ngIf="grievanceService.getCommentsForGrievance(commentModalGrievance.id).length === 0" class="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl">
              No comments or notes posted yet for this grievance.
            </div>
          </div>

          <!-- Post Comment Box -->
          <div class="pt-3 border-t space-y-3">
            <label class="block text-xs font-bold text-slate-700 uppercase">Add Executive Remark / Comment</label>
            <textarea 
              [(ngModel)]="adminCommentText" 
              rows="3" 
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              data-lpignore="true"
              placeholder="Write a message..." 
              class="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-[#A0C8C3]"
            ></textarea>

            <div class="flex items-center space-x-2">
              <input type="checkbox" id="adminInternalCheck" [(ngModel)]="isAdminInternalOnly" class="rounded text-teal-700 focus:ring-teal-500" />
              <label for="adminInternalCheck" class="text-xs text-slate-600 font-medium">Internal Note (Visible to Officers & Admin only)</label>
            </div>

            <div class="flex space-x-2 pt-2">
              <button (click)="commentModalGrievance = null" class="flex-1 bg-slate-100 py-2.5 rounded-xl text-xs font-bold text-slate-600">Close</button>
              <button 
                (click)="postAdminComment()" 
                [disabled]="!adminCommentText.trim()" 
                class="flex-1 bg-[#0F172A] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition"
              >
                Post Comment
              </button>
            </div>
          </div>

        </div>
      </div>

      <app-toast [message]="toastMessage()" (dismiss)="toastMessage.set(null)"></app-toast>

    </div>
  `
})
export class GrievanceAssignmentComponent {
  grievanceService = inject(GrievanceService);
  departmentService = inject(DepartmentService);
  authService = inject(AuthService);

  selectedGrievance: Grievance | null = null;
  commentModalGrievance: Grievance | null = null;
  adminCommentText = '';
  isAdminInternalOnly = false;

  targetDeptId = '';
  targetOfficerId = '';
  toastMessage = signal<string | null>(null);

  searchKeyword = '';
  departmentFilter = 'ALL';
  lifecycleFilter = 'ALL';

  filteredGrievances(): Grievance[] {
    return this.grievanceService.grievances().filter(g => {
      const keyword = this.searchKeyword.toLowerCase().trim();
      const matchesSearch = !keyword ||
        g.trackingCode.toLowerCase().includes(keyword) ||
        g.title.toLowerCase().includes(keyword) ||
        g.citizenName.toLowerCase().includes(keyword) ||
        g.location.toLowerCase().includes(keyword);

      const matchesDept = this.departmentFilter === 'ALL' ||
        g.departmentId === this.departmentFilter ||
        g.departmentName === this.departmentFilter ||
        g.category === this.departmentFilter;

      const matchesLifecycle = this.lifecycleFilter === 'ALL' || g.status === this.lifecycleFilter;

      return matchesSearch && matchesDept && matchesLifecycle;
    });
  }

  openAssignModal(g: Grievance) {
    this.selectedGrievance = g;
    const depts = this.departmentService.departments();
    const matched = depts.find(d => d.id === g.departmentId || d.name === g.departmentName || d.name === g.category) || depts[0];

    if (matched) {
      this.targetDeptId = matched.id;
    }

    const officers = this.getOfficersForTargetDept();
    if (officers.length > 0) {
      this.targetOfficerId = officers[0].id;
    } else {
      this.targetOfficerId = '';
    }
  }

  openCommentModal(g: Grievance) {
    this.commentModalGrievance = g;
    this.adminCommentText = '';
    this.isAdminInternalOnly = false;
  }

  postAdminComment() {
    if (!this.commentModalGrievance || !this.adminCommentText.trim()) return;

    this.grievanceService.addComment(
      this.commentModalGrievance.id,
      this.adminCommentText.trim(),
      this.isAdminInternalOnly
    );

    this.toastMessage.set(`Admin comment posted on ${this.commentModalGrievance.trackingCode}`);
    this.adminCommentText = '';
  }

  onDepartmentChange() {
    const officers = this.getOfficersForTargetDept();
    if (officers.length > 0) {
      this.targetOfficerId = officers[0].id;
    } else {
      this.targetOfficerId = '';
    }
  }

  getOfficersForTargetDept() {
    const dept = this.departmentService.departments().find(d => d.id === this.targetDeptId);
    if (!dept) return this.authService.registeredOfficers();

    const registered = this.authService.registeredOfficers().filter(o =>
      o.departmentId === dept.id || o.departmentName === dept.name
    );

    if (registered.length > 0) {
      return registered;
    }

    if (dept.assignedOfficers && dept.assignedOfficers.length > 0) {
      return dept.assignedOfficers;
    }

    return [];
  }

  confirmAssignment() {
    if (!this.selectedGrievance) return;
    const dept = this.departmentService.departments().find(d => d.id === this.targetDeptId) || {
      id: 'dept-default',
      name: this.selectedGrievance.departmentName || this.selectedGrievance.category
    };

    const officers = this.getOfficersForTargetDept();
    const officer = officers.find(o => o.id === this.targetOfficerId) || officers[0];
    const officerName = officer ? officer.name : 'Officer';

    this.grievanceService.assignGrievance(
      this.selectedGrievance.id,
      dept.id,
      dept.name,
      officer ? officer.id : '',
      officerName
    );

    this.toastMessage.set(`Grievance ${this.selectedGrievance.trackingCode} assigned to ${officerName} (${dept.name})`);
    this.selectedGrievance = null;
  }

  getProgressLabel(status: string): string {
    switch (status) {
      case 'submitted': return 'Submitted (Pending)';
      case 'assigned': return 'Assigned to Officer';
      case 'in_progress': return 'Under Investigation';
      case 'resolved': return 'Resolved';
      case 'closed': return 'Closed';
      case 'reopened': return 'Reopened';
      default: return 'Submitted';
    }
  }

  getProgressPercentage(status: string): number {
    switch (status) {
      case 'submitted': return 25;
      case 'assigned': return 50;
      case 'in_progress': return 75;
      case 'reopened': return 75;
      case 'resolved': return 100;
      case 'closed': return 100;
      default: return 25;
    }
  }

  getProgressColorClass(status: string): string {
    switch (status) {
      case 'submitted': return 'bg-amber-500';
      case 'assigned': return 'bg-blue-500';
      case 'in_progress': return 'bg-indigo-600';
      case 'resolved': return 'bg-emerald-500';
      case 'closed': return 'bg-slate-700';
      case 'reopened': return 'bg-rose-500';
      default: return 'bg-amber-500';
    }
  }
}
