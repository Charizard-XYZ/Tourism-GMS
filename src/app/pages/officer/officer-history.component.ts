import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GrievanceService } from '../../core/services/grievance.service';
import { DepartmentService } from '../../core/services/department.service';
import { AuthService } from '../../core/services/auth.service';
import { StatusBadgeComponent } from '../../common/components/status-badge.component';
import { WorkflowTimelineComponent } from '../../common/components/workflow-timeline.component';
import { IconComponent } from '../../common/components/icon.component';
import { Grievance } from '../../core/models/complaint.model';
import { capitalizeFirstChar } from '../../core/directives/capitalize-first.directive';

@Component({
  selector: 'app-officer-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusBadgeComponent, WorkflowTimelineComponent, IconComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      <!-- Top Title Header -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <div class="inline-flex items-center space-x-2 px-3 py-1 bg-amber-400/20 text-amber-300 rounded-full text-xs font-bold uppercase mb-1">
            <app-icon name="history" size="w-3.5 h-3.5"></app-icon>
            <span>Officer History Records</span>
          </div>
          <h1 class="text-2xl font-extrabold text-white">Case Resolution History</h1>
          <p class="text-xs text-[#A0C8C3]">Archived and resolved grievances with audit trails, proof files, and tourist feedback</p>
        </div>

        <div class="flex items-center space-x-3">
          <a routerLink="/officer/dashboard" class="px-4 py-2 bg-slate-800 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 border border-slate-700">
            <app-icon name="arrow-left" size="w-3.5 h-3.5"></app-icon>
            <span>Active Queue</span>
          </a>
        </div>
      </div>

      <!-- Filters & Search Bar -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid sm:grid-cols-3 gap-4">
        <div class="relative">
          <app-icon name="search" size="w-4 h-4" class="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"></app-icon>
          <input 
            type="text" 
            [(ngModel)]="searchKeyword" 
            (ngModelChange)="onSearchChange($event)"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            data-lpignore="true"
            placeholder="Search by code, title, tourist..." 
            class="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#A0C8C3]"
          />
        </div>

        <select [(ngModel)]="statusFilter" class="px-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#A0C8C3]">
          <option value="ALL">All Statuses</option>
          <option value="closed">Closed Only</option>
          <option value="resolved">Resolved Only</option>
          <option value="in_progress">In Progress</option>
          <option value="assigned">Assigned</option>
        </select>

        <select [(ngModel)]="departmentFilter" class="px-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#A0C8C3]">
          <option value="ALL">All Departments</option>
          <option *ngFor="let d of departmentService.departments()" [value]="d.id">
            {{ d.name }} ({{ d.code }})
          </option>
        </select>
      </div>

      <!-- History Table -->
      <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-900 text-white uppercase text-[10px] font-bold">
            <tr>
              <th class="p-4">Tracking Code</th>
              <th class="p-4">Complaint Title</th>
              <th class="p-4">Department</th>
              <th class="p-4">Tourist</th>
              <th class="p-4">Resolved Date</th>
              <th class="p-4">Status</th>
              <th class="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <tr *ngFor="let g of filteredHistory()" (click)="openDetailModal(g)" class="hover:bg-slate-50 cursor-pointer transition">
              <td class="p-4 font-mono font-bold text-slate-800">{{ g.trackingCode || g.grievanceCode }}</td>
              <td class="p-4 max-w-xs font-bold text-slate-900 truncate">{{ g.title }}</td>
              <td class="p-4">
                <span class="font-bold text-teal-800">{{ g.departmentName || g.category }}</span>
              </td>
              <td class="p-4 text-slate-600">{{ g.touristName || 'Tourist' }}</td>
              <td class="p-4 text-slate-500">
                {{ g.resolvedAt ? (g.resolvedAt | date:'dd/MM/yyyy') : (g.updatedAt | date:'dd/MM/yyyy') }}
              </td>
              <td class="p-4">
                <app-status-badge [status]="g.status"></app-status-badge>
              </td>
              <td class="p-4 text-right">
                <button (click)="$event.stopPropagation(); openDetailModal(g)" class="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-bold text-xs hover:bg-slate-800 transition inline-flex items-center space-x-1 shadow-xs">
                  <app-icon name="eye" size="w-3.5 h-3.5"></app-icon>
                  <span>View Details</span>
                </button>
              </td>
            </tr>

            <tr *ngIf="filteredHistory().length === 0">
              <td colspan="7" class="p-8 text-center text-slate-400 italic">
                No historical grievances found matching your search criteria.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Closed / Historical Case Detail Modal (Strictly Read-Only) -->
      <div *ngIf="selectedCase" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
        <div class="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto animate-modal-pop">
          
          <!-- Modal Header -->
          <div class="flex justify-between items-start border-b pb-3">
            <div>
              <div class="flex items-center space-x-2">
                <span class="text-xs font-mono font-bold text-slate-500">{{ selectedCase.trackingCode || selectedCase.grievanceCode }}</span>
                <app-status-badge [status]="selectedCase.status"></app-status-badge>
                <span class="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold uppercase rounded">Read-Only History</span>
              </div>
              <h3 class="font-extrabold text-lg text-slate-900 mt-1">{{ selectedCase.title }}</h3>
            </div>
            <button (click)="selectedCase = null" class="text-slate-400 hover:text-slate-600 p-1">
              <app-icon name="x" size="w-5 h-5"></app-icon>
            </button>
          </div>

          <!-- Complete Status Timeline -->
          <div class="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
            <h4 class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Complete Status Timeline</h4>
            <app-workflow-timeline [grievance]="selectedCase"></app-workflow-timeline>
          </div>

          <!-- Case Redressal Details Grid -->
          <div class="grid sm:grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
            <div>
              <span class="text-slate-500 block text-[10px] font-bold uppercase">Resolved By Officer</span>
              <span class="font-extrabold text-slate-900 text-sm">{{ selectedCase.assignedOfficerName || 'Officer' }}</span>
            </div>
            <div>
              <span class="text-slate-500 block text-[10px] font-bold uppercase">Department</span>
              <span class="font-bold text-teal-800 text-sm">{{ selectedCase.departmentName || selectedCase.category }}</span>
            </div>
            <div>
              <span class="text-slate-500 block text-[10px] font-bold uppercase">Tourist Info</span>
              <span class="font-bold text-slate-800">{{ selectedCase.touristName || 'Tourist' }}</span>
              <span *ngIf="selectedCase.touristEmail" class="text-slate-500 block text-[11px] font-mono">{{ selectedCase.touristEmail }}</span>
            </div>
            <div>
              <span class="text-slate-500 block text-[10px] font-bold uppercase">Filed / Resolved Timestamps</span>
              <span class="text-slate-700 block">Filed: {{ selectedCase.createdAt | date:'dd/MM/yyyy, hh:mm a' }}</span>
              <span *ngIf="selectedCase.resolvedAt" class="text-emerald-700 font-bold block">Resolved: {{ selectedCase.resolvedAt | date:'dd/MM/yyyy, hh:mm a' }}</span>
            </div>
          </div>

          <!-- Resolution Comments & Proof Files (Official Resolution) -->
          <div class="p-4 bg-emerald-50/90 border border-emerald-200 rounded-2xl space-y-3">
            <div class="flex items-center space-x-2 text-emerald-900">
              <app-icon name="check-circle" size="w-4 h-4"></app-icon>
              <h4 class="text-xs font-extrabold uppercase tracking-wide">Official Resolution Report</h4>
            </div>

            <div *ngIf="selectedCase.resolutionDetails">
              <p class="text-xs text-emerald-950 leading-relaxed whitespace-pre-line bg-white/70 p-3 rounded-xl border border-emerald-100">{{ selectedCase.resolutionDetails }}</p>
            </div>
            <div *ngIf="!selectedCase.resolutionDetails" class="text-xs text-emerald-700 italic">
              No written resolution summary recorded.
            </div>

            <!-- Uploaded Proof Files with Links to View/Download -->
            <div *ngIf="selectedCase.resolutionAttachments && selectedCase.resolutionAttachments.length > 0" class="pt-2">
              <p class="text-[11px] font-bold text-emerald-900 uppercase mb-2">Inspection Proof / Resolution Documents:</p>
              <div class="flex flex-wrap gap-2">
                <a 
                  *ngFor="let att of selectedCase.resolutionAttachments" 
                  [href]="att.url" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  class="px-3.5 py-2 bg-white border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center space-x-2 hover:bg-emerald-100 transition shadow-sm"
                >
                  <app-icon name="file-text" size="w-3.5 h-3.5"></app-icon>
                  <span>{{ att.name }}</span>
                  <span *ngIf="att.size" class="text-[10px] text-emerald-600 font-semibold">({{ att.size }})</span>
                  <app-icon name="download" size="w-3 h-3" class="text-emerald-600"></app-icon>
                </a>
              </div>
            </div>
            <div *ngIf="!selectedCase.resolutionAttachments || selectedCase.resolutionAttachments.length === 0" class="text-xs text-emerald-700 italic">
              No proof documents uploaded for this case.
            </div>
          </div>

          <!-- Tourist Feedback & Rating (if available) -->
          <div *ngIf="selectedCase.rating" class="p-4 bg-white rounded-2xl border border-emerald-200 text-xs space-y-1.5 shadow-xs">
            <span class="text-emerald-900 font-bold uppercase text-[10px]">Tourist Submitted Rating:</span>
            <div class="flex items-center space-x-1 text-amber-500 font-bold text-sm">
              <app-icon *ngFor="let s of [1,2,3,4,5]" [name]="s <= selectedCase.rating ? 'star' : 'star-outline'" size="w-4 h-4"></app-icon>
              <span class="text-slate-800 ml-1">({{ selectedCase.rating }} / 5 Stars)</span>
            </div>
            <p *ngIf="selectedCase.feedbackComments" class="text-slate-700 italic text-xs mt-1">"{{ selectedCase.feedbackComments }}"</p>
          </div>

          <!-- Complaint Description -->
          <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
            <h4 class="font-extrabold text-slate-800 uppercase">Original Grievance Description</h4>
            <p class="text-slate-700 leading-relaxed whitespace-pre-line">{{ selectedCase.description }}</p>

            <div *ngIf="selectedCase.attachments && selectedCase.attachments.length > 0" class="pt-2">
              <p class="font-bold text-slate-600 uppercase text-[10px] mb-1">Tourist Evidence Files:</p>
              <div class="flex flex-wrap gap-2">
                <a *ngFor="let att of selectedCase.attachments" [href]="att.url" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs flex items-center space-x-1 hover:bg-slate-100">
                  <app-icon name="file" size="w-3 h-3"></app-icon>
                  <span>{{ att.name }}</span>
                </a>
              </div>
            </div>
          </div>

          <!-- Discussion History -->
          <div class="space-y-2">
            <h4 class="font-extrabold text-slate-800 uppercase text-xs">Discussion & Status Log History</h4>
            <div class="space-y-2 max-h-48 overflow-y-auto pr-1">
              <div *ngFor="let c of grievanceService.getCommentsForGrievance(selectedCase.id)" class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div class="flex justify-between items-center">
                  <span class="font-bold text-slate-900 text-xs">{{ getCommentAuthor(c) }}</span>
                  <div class="flex items-center space-x-1.5">
                    <span *ngIf="c.isInternalOnly" class="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-bold rounded">Internal</span>
                    <span class="text-[10px] text-slate-400">{{ c.createdAt | date:'dd/MM/yyyy, hh:mm a' }}</span>
                  </div>
                </div>
                <p class="text-slate-700 leading-snug">{{ c.commentText }}</p>
              </div>

              <div *ngIf="grievanceService.getCommentsForGrievance(selectedCase.id).length === 0" class="text-xs text-slate-400 italic text-center p-3">
                No comment records for this case.
              </div>
            </div>
          </div>

          <!-- Read-Only Notice -->
          <div class="p-3 bg-slate-100 rounded-xl text-center text-xs text-slate-500 font-medium">
            🔒 This case is closed and preserved for audit purposes. History records are strictly read-only.
          </div>

          <div class="flex justify-end pt-2 border-t">
            <button (click)="selectedCase = null" class="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800">
              Close Details
            </button>
          </div>
        </div>
      </div>

    </div>
  `
})
export class OfficerHistoryComponent implements OnInit {
  grievanceService = inject(GrievanceService);
  departmentService = inject(DepartmentService);
  authService = inject(AuthService);

  searchKeyword = '';
  statusFilter = 'ALL';
  departmentFilter = 'ALL';

  selectedCase: Grievance | null = null;

  async ngOnInit() {
    await this.grievanceService.loadGrievancesFromBackend();
    await this.grievanceService.loadCommentsFromBackend();
  }

  onSearchChange(val: string) {
    this.searchKeyword = capitalizeFirstChar(val);
  }

  openDetailModal(g: Grievance) {
    this.selectedCase = g;
  }

  getCommentAuthor(c: any): string {
    return this.grievanceService.getCommentAuthor(c);
  }

  readonly filteredHistory = computed(() => {
    const list = this.grievanceService.allOfficerGrievances();
    const kw = this.searchKeyword.toLowerCase().trim();
    const st = this.statusFilter;
    const dp = this.departmentFilter;

    return list.filter(g => {
      // Search filter
      const matchesSearch = !kw ||
        g.trackingCode.toLowerCase().includes(kw) ||
        ((g as any).grievanceCode && (g as any).grievanceCode.toLowerCase().includes(kw)) ||
        g.title.toLowerCase().includes(kw) ||
        (!!g.touristName && g.touristName.toLowerCase().includes(kw)) ||
        g.location.toLowerCase().includes(kw);

      // Status filter
      const matchesStatus = st === 'ALL' || g.status === st;

      // Department filter
      const matchesDept = dp === 'ALL' || g.departmentId === dp;

      return matchesSearch && matchesStatus && matchesDept;
    });
  });
}
