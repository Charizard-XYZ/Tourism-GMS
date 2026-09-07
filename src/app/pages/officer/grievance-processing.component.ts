import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GrievanceService } from '../../core/services/grievance.service';
import { AuthService } from '../../core/services/auth.service';
import { DepartmentService } from '../../core/services/department.service';
import { Grievance, GrievanceStatus } from '../../core/models/complaint.model';
import { StatusBadgeComponent } from '../../common/components/status-badge.component';
import { ToastComponent } from '../../common/components/toast.component';
import { IconComponent } from '../../common/components/icon.component';

@Component({
  selector: 'app-grievance-processing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusBadgeComponent, ToastComponent, IconComponent],
  template: `
    <div *ngIf="grievance" class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <!-- Top Action Bar -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <div class="flex items-center space-x-2">
            <span class="font-mono text-xs text-[#A0C8C3] font-bold">{{ grievance.trackingCode }}</span>
            <app-status-badge [status]="grievance.status"></app-status-badge>
          </div>
          <h1 class="text-xl font-bold mt-1">Processing Case: {{ grievance.title }}</h1>
        </div>

        <a routerLink="/officer/dashboard" class="px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-700 flex items-center space-x-1.5">
          <app-icon name="arrow-left" size="w-4 h-4"></app-icon>
          <span>Officer Desk</span>
        </a>
      </div>

      <!-- Main Workspace Grid -->
      <div class="grid lg:grid-cols-12 gap-8">
        
        <!-- Left 7 Cols: Complaint Info & Notes Feed -->
        <div class="lg:col-span-7 space-y-6">
          
          <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 class="font-bold text-slate-900 text-base border-b pb-2">Tourist Grievance Details</h3>
            <p class="text-xs text-slate-700 whitespace-pre-line leading-relaxed">{{ grievance.description }}</p>

            <div class="grid grid-cols-2 gap-4 text-xs pt-3 border-t border-slate-100 text-slate-600">
              <div>
                <p class="text-slate-400">Tourist Name</p>
                <p class="font-bold text-slate-900">{{ grievance.touristName || 'Tourist' }}</p>
                <p class="text-[11px] text-slate-500">{{ grievance.touristPhone || grievance.touristEmail || 'No contact details' }}</p>
              </div>
              <div>
                <p class="text-slate-400">Incident Location</p>
                <p class="font-bold text-slate-900">{{ grievance.location }}</p>
              </div>
            </div>
          </div>

          <!-- Internal Notes & Discussion -->
          <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 class="font-bold text-slate-900 text-base border-b pb-2">Internal Notes & Public Log</h3>

            <div class="space-y-3">
              <div *ngFor="let c of grievanceService.getCommentsForGrievance(grievance.id)" [class.bg-amber-50]="c.isInternalOnly" [class.bg-slate-50]="!c.isInternalOnly" class="p-3.5 rounded-2xl border border-slate-100 space-y-1">
                <div class="flex justify-between items-center">
                  <span class="font-bold text-xs text-slate-900">
                    {{ c.userName }} 
                    <span *ngIf="c.isInternalOnly" class="px-1.5 py-0.5 bg-amber-200 text-amber-900 text-[9px] rounded font-extrabold ml-1">INTERNAL NOTE</span>
                  </span>
                  <span class="text-[10px] text-slate-400">{{ c.createdAt | date:'dd/MM/yyyy, hh:mm a' }}</span>
                </div>
                <p class="text-xs text-slate-700 leading-snug">{{ c.commentText }}</p>
              </div>
            </div>

            <!-- Post Note Form -->
            <div class="pt-3 border-t space-y-2">
              <textarea [(ngModel)]="noteText" rows="2" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" placeholder="Write a message" class="w-full px-4 py-2 border rounded-xl text-xs"></textarea>
              <div class="flex justify-between items-center">
                <label class="flex items-center space-x-2 text-xs text-slate-600 font-semibold cursor-pointer">
                  <input type="checkbox" [(ngModel)]="isInternalOnly" class="rounded text-amber-500" />
                  <span>Mark as Confidential Internal Note (Officer/Admin only)</span>
                </label>
                <button 
                  (click)="postNote()" 
                  [disabled]="!noteText.trim() || isPostingNote()" 
                  class="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center space-x-1.5 min-h-[36px] min-w-[110px]"
                >
                  <app-icon *ngIf="isPostingNote()" name="loader" size="w-3.5 h-3.5" class="animate-spin shrink-0"></app-icon>
                  <app-icon *ngIf="!isPostingNote()" name="send" size="w-3.5 h-3.5"></app-icon>
                  <span>{{ isPostingNote() ? 'Saving...' : 'Save Note' }}</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        <!-- Right 5 Cols: Officer Action Control Panel -->
        <div class="lg:col-span-5 space-y-6">
          
          <!-- Cancelled Grievance Warning — disables all processing actions -->
          <div *ngIf="isGrievanceCancelled()" class="bg-rose-50 border border-rose-200 rounded-3xl p-5 flex items-start space-x-4">
            <div class="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
              <app-icon name="x-circle" size="w-5 h-5" class="text-rose-600"></app-icon>
            </div>
            <div>
              <p class="text-xs font-extrabold text-rose-800 uppercase mb-1">Grievance Cancelled</p>
              <p class="text-xs text-rose-700">
                This grievance has been cancelled by the Tourist. Officers cannot process, update, or treat this grievance as an active assignment.
              </p>
            </div>
          </div>

          <!-- Not Assigned to Current Officer Warning -->
          <div *ngIf="!isGrievanceCancelled() && !isAssignedToCurrentOfficer()" class="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex items-start space-x-4">
            <div class="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <app-icon name="alert-triangle" size="w-5 h-5" class="text-amber-600"></app-icon>
            </div>
            <div>
              <p class="text-xs font-extrabold text-amber-800 uppercase mb-1">Assigned to Another Officer</p>
              <p class="text-xs text-amber-700">
                This grievance is assigned to {{ grievance.assignedOfficerName || 'another officer' }}. Only the assigned officer can update this grievance's status.
              </p>
            </div>
          </div>

          <!-- Department Inactive Warning — disables all update actions -->
          <div *ngIf="!isGrievanceCancelled() && isDepartmentInactive()" class="bg-rose-50 border border-rose-200 rounded-3xl p-5 flex items-start space-x-4">
            <div class="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
              <app-icon name="alert-circle" size="w-5 h-5" class="text-rose-600"></app-icon>
            </div>
            <div>
              <p class="text-xs font-extrabold text-rose-800 uppercase mb-1">Department is Inactive</p>
              <p class="text-xs text-rose-700">
                The department assigned to this case has been deactivated. Officers cannot update grievance progress until the department is reactivated by an Administrator.
              </p>
            </div>
          </div>

          <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6" [class.opacity-50]="isDepartmentInactive() || isGrievanceCancelled() || !isAssignedToCurrentOfficer()" [class.pointer-events-none]="isDepartmentInactive() || isGrievanceCancelled() || !isAssignedToCurrentOfficer()">
            <h3 class="font-bold text-slate-900 text-base border-b pb-2">Status & Resolution Controls</h3>

            <!-- Status Dropdown -->
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Update Complaint Status</label>
              <select [(ngModel)]="selectedStatus" class="w-full px-4 py-2.5 border rounded-xl text-xs font-bold">
                <option value="assigned">Assigned (Queue)</option>
                <option value="in_progress">In Progress (Under Inquiry)</option>
                <option value="resolved">Resolved (Complete)</option>
              </select>
            </div>

            <!-- Resolution Details Input (Required if resolved) -->
            <div *ngIf="selectedStatus === 'resolved' || (grievance.resolutionAttachments && grievance.resolutionAttachments.length > 0)" class="space-y-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <label class="block text-xs font-extrabold text-emerald-900 uppercase">Official Resolution Report & Uploaded Proof</label>
              <textarea [(ngModel)]="resolutionReport" rows="4" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" placeholder="Detail official findings, penalty issued, refund provided, or corrective action taken..." class="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs"></textarea>

              <button type="button" (click)="simulateResolutionProof()" class="w-full py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition inline-flex items-center justify-center space-x-1.5">
                <app-icon name="plus" size="w-3.5 h-3.5"></app-icon>
                <span>Attach Inspection Proof / PDF</span>
              </button>

              <div *ngIf="resolutionFiles.length > 0 || (grievance.resolutionAttachments && grievance.resolutionAttachments.length > 0)" class="text-xs text-emerald-800 space-y-1.5 pt-1">
                <p class="font-bold text-[11px] text-emerald-900 uppercase">Attached Resolution Proof Files:</p>
                <div class="flex flex-wrap gap-2">
                  <a *ngFor="let f of (resolutionFiles.length > 0 ? resolutionFiles : grievance.resolutionAttachments)" [href]="f.url" target="_blank" class="px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center space-x-1.5 hover:bg-emerald-100 transition shadow-sm">
                    <span>{{ f.name }}</span>
                    <span *ngIf="f.size" class="text-[10px] text-emerald-600 font-semibold">({{ f.size }})</span>
                  </a>
                </div>
              </div>
            </div>

            <button 
              (click)="saveStatusUpdate()" 
              [disabled]="isUpdatingStatus()"
              class="w-full bg-amber-500 text-slate-950 py-3 rounded-xl font-extrabold text-xs hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-md inline-flex items-center justify-center space-x-1.5 min-h-[44px] min-w-[260px]"
            >
              <app-icon *ngIf="isUpdatingStatus()" name="loader" size="w-4 h-4" class="animate-spin shrink-0"></app-icon>
              <app-icon *ngIf="!isUpdatingStatus()" name="check-circle" size="w-4 h-4"></app-icon>
              <span>{{ isUpdatingStatus() ? 'Updating...' : 'Update Case Status & Notify Tourist' }}</span>
            </button>
          </div>

        </div>

      </div>

      <app-toast [message]="toastMessage()" (dismiss)="toastMessage.set(null)"></app-toast>

    </div>
  `
})
export class GrievanceProcessingComponent implements OnInit {
  route = inject(ActivatedRoute);
  router = inject(Router);
  grievanceService = inject(GrievanceService);
  authService = inject(AuthService);
  departmentService = inject(DepartmentService);

  grievance?: Grievance;
  selectedStatus: GrievanceStatus = 'in_progress';
  resolutionReport = '';
  resolutionFiles: any[] = [];
  
  noteText = '';
  isInternalOnly = true;

  toastMessage = signal<string | null>(null);

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.grievance = this.grievanceService.getGrievanceById(id);
      if (!this.grievance) {
        try {
          const fetched = await this.grievanceService.fetchGrievanceById(id);
          if (fetched) {
            this.grievance = fetched;
          }
        } catch (e) {
          console.warn('Failed to fetch grievance on direct route:', e);
        }
      }
      if (this.grievance) {
        this.selectedStatus = this.grievance.status;
        this.resolutionReport = this.grievance.resolutionDetails || '';
      }
    }
  }

  isGrievanceCancelled(): boolean {
    return this.grievance?.status === 'cancelled';
  }

  isAssignedToCurrentOfficer(): boolean {
    if (!this.grievance) return false;
    const user = this.authService.currentUser();
    if (!user) return false;
    const assignedId = this.grievance.assignedOfficerId;
    return assignedId === user.uid || (!!user.email && assignedId === user.email);
  }

  isDepartmentInactive(): boolean {
    if (!this.grievance) return false;
    const deptId = (this.grievance as any)['departmentId'] || '';
    if (!deptId) return false;
    const dept = this.departmentService.departments().find(d => d.id === deptId);
    // If dept not found in active list — treat as deleted/inactive
    if (!dept) return true;
    return dept.isActive === false;
  }

  isUpdatingStatus = signal<boolean>(false);
  isPostingNote = signal<boolean>(false);

  async postNote() {
    if (!this.grievance || !this.noteText.trim() || this.isPostingNote()) return;
    if (this.isGrievanceCancelled()) {
      this.toastMessage.set('Cancelled grievances cannot be updated or processed.');
      return;
    }
    this.isPostingNote.set(true);
    try {
      await this.grievanceService.addComment(this.grievance.id, this.noteText.trim(), this.isInternalOnly);
      this.noteText = '';
    } catch (err: any) {
      this.toastMessage.set(err?.message || 'Failed to post note.');
    } finally {
      this.isPostingNote.set(false);
    }
  }

  simulateResolutionProof() {
    this.resolutionFiles.push({
      name: `Officer_Inspection_Report_${Date.now().toString().slice(-4)}.pdf`,
      url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600',
      size: '920 KB',
      type: 'application/pdf'
    });
  }

  async saveStatusUpdate() {
    if (!this.grievance || this.isUpdatingStatus()) return;
    if (this.isGrievanceCancelled()) {
      this.toastMessage.set('Cancelled grievances cannot be updated or processed.');
      return;
    }
    if (!this.isAssignedToCurrentOfficer()) {
      this.toastMessage.set('Forbidden: Only the assigned officer can update this grievance.');
      return;
    }
    if (this.isDepartmentInactive()) {
      this.toastMessage.set('Department is inactive. Officers cannot update grievance progress.');
      return;
    }
    this.isUpdatingStatus.set(true);
    try {
      await this.grievanceService.updateStatus(this.grievance.id, this.selectedStatus, this.resolutionReport, this.resolutionFiles);
      this.toastMessage.set(`Case status updated to ${this.selectedStatus.toUpperCase()}`);
      
      setTimeout(() => {
        this.isUpdatingStatus.set(false);
        this.router.navigate(['/officer/dashboard']);
      }, 1200);
    } catch (err: any) {
      this.isUpdatingStatus.set(false);
      this.toastMessage.set(err?.message || 'Failed to update case status.');
    }
  }
}
