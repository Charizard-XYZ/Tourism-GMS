import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GrievanceService } from '../../core/services/grievance.service';
import { DepartmentService } from '../../core/services/department.service';
import { AuthService } from '../../core/services/auth.service';
import { StatusBadgeComponent } from '../../common/components/status-badge.component';
import { ToastComponent } from '../../common/components/toast.component';
import { Grievance } from '../../core/models/complaint.model';
import { capitalizeFirstChar } from '../../core/directives/capitalize-first.directive';

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
        <div class="relative">
          <svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input 
            type="text" 
            [(ngModel)]="searchKeyword" 
            (ngModelChange)="onSearchChange($event)"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            data-lpignore="true"
            placeholder="Search by Code, Title, Officer Name..." 
            class="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#A0C8C3]"
          />
        </div>

        <select [(ngModel)]="departmentFilter" class="px-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#A0C8C3]">
          <option value="ALL">All Departments</option>
          <option *ngFor="let d of departmentService.departments()" [value]="d.id">
            {{ d.name }} ({{ d.code }})
          </option>
        </select>

        <select [(ngModel)]="lifecycleFilter" class="px-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#A0C8C3]">
          <option value="ALL">All Redressal Lifecycle</option>
          <option value="submitted">New / Pending Assignment</option>
          <option value="assigned">Assigned to Officer</option>
          <option value="in_progress">Under Inquiry / In Progress</option>
          <option value="resolved">Complete</option>
          <option value="closed">Ticket Closed</option>
          <option value="reopened">Escalated / Reopened</option>
          <option value="cancelled">Cancelled</option>
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
                <button (click)="openCommentModal(g)" class="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-extrabold text-xs hover:bg-slate-800 transition shadow-sm">
                  Comments ({{ grievanceService.getCommentsForGrievance(g.id).length }})
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

      <!-- Action Required: Unassigned Grievance Tickets -->
      <div *ngIf="getUnassignedActionRequired().length > 0" class="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-rose-100 text-rose-700 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0">
              <svg class="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <div>
              <h2 class="text-base font-extrabold text-slate-900">Unassigned Grievance Tickets</h2>
              <p class="text-xs text-slate-500">Overview of active grievances pending officer allocation grouped by department category</p>
            </div>
          </div>
          <span class="px-3 py-1 bg-rose-100 text-rose-800 font-extrabold text-xs rounded-full self-start sm:self-auto">
            {{ getUnassignedActionRequired().length }} Total Unassigned
          </span>
        </div>

        <!-- Department Category Groups in One Card -->
        <div class="space-y-4">
          <div *ngFor="let group of getUnassignedByDepartmentGroup()" class="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
            <div class="p-3.5 bg-slate-100 flex items-center justify-between border-b border-slate-200">
              <div class="flex items-center space-x-2">
                <span class="font-extrabold text-xs text-slate-900">{{ group.departmentName }}</span>
                <span *ngIf="group.isDeleted" class="px-2 py-0.5 bg-rose-200 text-rose-800 text-[10px] font-bold rounded">
                  Department Not Found / Deleted
                </span>
              </div>
              <span class="px-2.5 py-0.5 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-lg shadow-xs">
                {{ group.grievances.length }} Unassigned Ticket{{ group.grievances.length === 1 ? '' : 's' }}
              </span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th class="p-3">Grievance Code</th>
                    <th class="p-3">Title</th>
                    <th class="p-3">Tourist</th>
                    <th class="p-3">Location</th>
                    <th class="p-3">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200/60 font-medium">
                  <tr *ngFor="let g of group.grievances" class="hover:bg-white/80 transition">
                    <td class="p-3 font-mono font-bold text-slate-800">{{ g.grievanceCode || g.trackingCode }}</td>
                    <td class="p-3 font-bold text-slate-900 max-w-xs truncate">{{ g.title }}</td>
                    <td class="p-3 text-slate-600">{{ g.touristName || 'Tourist' }}</td>
                    <td class="p-3 text-slate-500">{{ g.location }}</td>
                    <td class="p-3">
                      <app-status-badge [status]="g.status"></app-status-badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State if No Unassigned Tickets Exist -->
      <div *ngIf="getUnassignedActionRequired().length === 0" class="bg-white rounded-3xl p-6 border border-slate-200 text-center text-slate-400 text-xs shadow-xs">
        <svg class="w-8 h-8 text-emerald-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p class="font-bold text-slate-700">All active grievances are assigned to departmental officers.</p>
        <p class="text-[11px] text-slate-400 mt-0.5">No unassigned tickets require immediate allocation.</p>
      </div>

      <!-- Admin Grievance Comments & Discussion Modal -->
      <div *ngIf="commentModalGrievance" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div class="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
          <div class="flex justify-between items-center border-b pb-3">
            <div>
              <span class="text-[10px] font-mono font-bold text-slate-500">{{ commentModalGrievance.trackingCode }}</span>
              <h3 class="font-bold text-base text-slate-900">Admin Case Discussion & Comments</h3>
            </div>
            <button (click)="commentModalGrievance = null" class="text-slate-400 hover:text-slate-600 p-1">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <h4 class="text-xs font-extrabold text-slate-800 uppercase">Grievance Description & Tourist Attachments</h4>
            <p class="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{{ commentModalGrievance.description }}</p>

            <!-- Tourist Attached Files -->
            <div *ngIf="commentModalGrievance.attachments && commentModalGrievance.attachments.length > 0" class="pt-2">
              <p class="text-[11px] font-bold text-slate-700 uppercase mb-1.5">Submitted Tourist Complaint Evidence Files:</p>
              <div class="flex flex-wrap gap-2">
                <a *ngFor="let att of commentModalGrievance.attachments" [href]="att.url" target="_blank" class="px-3 py-1.5 bg-white border border-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center space-x-1.5 hover:bg-slate-100 transition shadow-xs">
                  <span>{{ att.name }}</span>
                  <span *ngIf="att.size" class="text-[10px] text-slate-500 font-semibold">({{ att.size }})</span>
                </a>
              </div>
            </div>
          </div>

          <!-- Display Official Resolution Report & Uploaded Proof Files for Admin -->
          <div *ngIf="commentModalGrievance.resolutionDetails || (commentModalGrievance.resolutionAttachments && commentModalGrievance.resolutionAttachments.length > 0)" class="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
            <h4 class="text-xs font-extrabold text-emerald-900 uppercase">Official Report & Uploaded Proof File</h4>
            <p *ngIf="commentModalGrievance.resolutionDetails" class="text-xs text-emerald-950 leading-relaxed whitespace-pre-line">{{ commentModalGrievance.resolutionDetails }}</p>

            <div *ngIf="commentModalGrievance.resolutionAttachments && commentModalGrievance.resolutionAttachments.length > 0" class="pt-1">
              <p class="text-[11px] font-bold text-emerald-800 uppercase mb-1.5">Uploaded Officer Proof / Inspection Reports:</p>
              <div class="flex flex-wrap gap-2">
                <a *ngFor="let att of commentModalGrievance.resolutionAttachments" [href]="att.url" target="_blank" class="px-3.5 py-1.5 bg-white border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center space-x-1.5 hover:bg-emerald-100 transition shadow-sm">
                  <span>{{ att.name }}</span>
                  <span *ngIf="att.size" class="text-[10px] text-emerald-600 font-semibold">({{ att.size }})</span>
                </a>
              </div>
            </div>
          </div>

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

            <div *ngIf="grievanceService.getCommentsForGrievance(commentModalGrievance.id).length === 0" class="text-xs text-slate-400 italic text-center p-4">
              No comments or progress logs recorded yet.
            </div>
          </div>

          <!-- Add Note Box -->
          <div class="pt-3 border-t space-y-2">
            <textarea 
              [(ngModel)]="adminCommentText" 
              rows="2" 
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              data-lpignore="true"
              placeholder="Write an administrative guidance note or update for this case..." 
              class="w-full px-3 py-2 border rounded-xl text-xs"
            ></textarea>
            
            <div class="flex justify-between items-center">
              <label class="flex items-center space-x-2 text-xs text-slate-600 font-semibold cursor-pointer">
                <input type="checkbox" [(ngModel)]="isAdminInternalOnly" class="rounded text-teal-600" />
                <span>Mark as Internal Staff Note</span>
              </label>

              <button 
                (click)="postAdminComment()" 
                [disabled]="!adminCommentText.trim()" 
                class="px-4 py-2 bg-[#0F172A] text-white rounded-xl text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition shadow-xs"
              >
                Post Comment
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Assign Officer Modal -->
      <div *ngIf="selectedGrievance" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
        <div class="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
          <div class="flex justify-between items-center border-b pb-3">
            <div>
              <span class="text-[10px] font-mono font-bold text-slate-500">{{ selectedGrievance.trackingCode }}</span>
              <h3 class="font-bold text-base text-slate-900">Assign / Reassign Officer</h3>
            </div>
            <button (click)="selectedGrievance = null" class="text-slate-400 hover:text-slate-600 p-1">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="space-y-3 text-xs">
            <div>
              <label class="block font-bold text-slate-700 uppercase mb-1">Target Department</label>
              <select [(ngModel)]="targetDeptId" (change)="onDepartmentChange()" class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#A0C8C3]">
                <option *ngFor="let d of departmentService.departments()" [value]="d.id">
                  {{ d.name }} ({{ d.code }})
                </option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-700 uppercase mb-1">Assigned Officer</label>
              <select [(ngModel)]="targetOfficerId" class="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#A0C8C3]">
                <option *ngFor="let o of getOfficersForTargetDept()" [value]="o.id">
                  {{ o.name }} ({{ o.email }})
                </option>
              </select>

              <!-- Warning and Register Officer navigation when no officer is available -->
              <div *ngIf="getOfficersForTargetDept().length === 0" class="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2">
                <p class="text-amber-800 font-medium">
                  No active officers found for this department. Please assign or register an officer for this department first.
                </p>
                <button 
                  type="button"
                  (click)="navigateToRegisterOfficer()" 
                  class="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#0F172A] text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition shadow-xs"
                >
                  <span>Register Officer</span>
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div class="flex justify-end space-x-2 pt-4 border-t">
            <button (click)="selectedGrievance = null" class="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button 
              (click)="confirmAssignment()" 
              [disabled]="!targetOfficerId"
              class="px-5 py-2 bg-[#0F172A] text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 transition shadow-sm"
            >
              Confirm Assignment
            </button>
          </div>
        </div>
      </div>

      <app-toast [message]="toastMessage()" (dismiss)="toastMessage.set(null)"></app-toast>

    </div>
  `
})
export class GrievanceAssignmentComponent implements OnInit {
  route = inject(ActivatedRoute);
  router = inject(Router);
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

  onSearchChange(val: string) {
    this.searchKeyword = capitalizeFirstChar(val);
  }

  navigateToRegisterOfficer() {
    this.selectedGrievance = null;
    this.router.navigate(['/admin/officers']);
  }

  async ngOnInit() {
    const searchParam = this.route.snapshot.queryParamMap.get('search');
    if (searchParam) {
      this.searchKeyword = searchParam;
    }
    await this.grievanceService.loadGrievancesFromBackend();
  }

  isGrievanceAssignedToValidDeptAndOfficer(g: Grievance): boolean {
    const depts = this.departmentService.departments();
    const registeredOfficers = this.authService.registeredOfficers();
    const activeOfficers = registeredOfficers.filter(o => !o.isRevoked);

    const deptName = g.departmentName || g.category;
    const targetDept = depts.find(d => 
      d.id === g.departmentId || 
      (deptName && d.name.toLowerCase().trim() === deptName.toLowerCase().trim()) ||
      (deptName && d.code.toLowerCase().trim() === deptName.toLowerCase().trim())
    );

    if (!targetDept || !targetDept.isActive) return false;

    const deptActiveOfficers = activeOfficers.filter(o =>
      o.departmentId === targetDept.id ||
      (o.departmentName && o.departmentName.toLowerCase().trim() === targetDept.name.toLowerCase().trim())
    );

    if (deptActiveOfficers.length === 0) return false;

    if (!g.assignedOfficerId) return false;

    const assignedOff = registeredOfficers.find(o => 
      o.id === g.assignedOfficerId || 
      o.email.toLowerCase().trim() === (g.assignedOfficerId || '').toLowerCase().trim() ||
      o.name.toLowerCase().trim() === (g.assignedOfficerName || '').toLowerCase().trim()
    );

    if (!assignedOff || assignedOff.isRevoked) return false;

    return true;
  }

  filteredGrievances(): Grievance[] {
    return this.grievanceService.grievances().filter(g => {
      const keyword = this.searchKeyword.toLowerCase().trim();
      const matchesSearch = !keyword ||
        g.trackingCode.toLowerCase().includes(keyword) ||
        ((g as any).grievanceCode && (g as any).grievanceCode.toLowerCase().includes(keyword)) ||
        g.title.toLowerCase().includes(keyword) ||
        (!!g.assignedOfficerName && g.assignedOfficerName.toLowerCase().includes(keyword)) ||
        g.location.toLowerCase().includes(keyword) ||
        (!!g.touristName && g.touristName.toLowerCase().includes(keyword));

      const matchesDept = this.departmentFilter === 'ALL' ||
        g.departmentId === this.departmentFilter ||
        g.departmentName === this.departmentFilter ||
        g.category === this.departmentFilter;

      const matchesLifecycle = this.lifecycleFilter === 'ALL' || g.status === this.lifecycleFilter;

      return matchesSearch && matchesDept && matchesLifecycle;
    });
  }

  /** Returns all unsolved grievances with no assigned officer */
  getUnassignedActionRequired(): Grievance[] {
    const unsolvedStatuses = ['submitted', 'assigned', 'in_progress', 'reopened'];
    return this.grievanceService.grievances().filter(g =>
      unsolvedStatuses.includes(g.status) && !g.assignedOfficerId
    );
  }

  /** Groups unassigned cases by their department category into single card structure */
  getUnassignedByDepartmentGroup(): { departmentName: string; isDeleted: boolean; grievances: Grievance[] }[] {
    const unassigned = this.getUnassignedActionRequired();
    const groups: Record<string, { departmentName: string; isDeleted: boolean; grievances: Grievance[] }> = {};

    for (const g of unassigned) {
      const isDeleted = (g as any).departmentDeleted === true;
      const deptName = (g as any).originalDepartmentName || g.departmentName || g.category || 'General Tourism';
      if (!groups[deptName]) {
        groups[deptName] = { departmentName: deptName, isDeleted, grievances: [] };
      }
      groups[deptName].grievances.push(g);
    }

    return Object.values(groups);
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
      case 'submitted': return 'Submitted';
      case 'assigned': return 'Assigned';
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
