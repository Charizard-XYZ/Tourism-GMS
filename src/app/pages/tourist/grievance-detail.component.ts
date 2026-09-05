import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GrievanceService } from '../../core/services/grievance.service';
import { DepartmentService } from '../../core/services/department.service';
import { AuthService } from '../../core/services/auth.service';
import { Grievance } from '../../core/models/complaint.model';
import { WorkflowTimelineComponent } from '../../common/components/workflow-timeline.component';
import { StatusBadgeComponent } from '../../common/components/status-badge.component';

@Component({
  selector: 'app-grievance-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, WorkflowTimelineComponent, StatusBadgeComponent],
  template: `
    <div *ngIf="grievance" class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <!-- Top Action Navigation Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div class="flex items-center space-x-3">
            <span class="font-mono text-sm font-bold text-slate-500">{{ grievance.trackingCode }}</span>
            <app-status-badge [status]="grievance.status"></app-status-badge>
            <span *ngIf="grievance.isEscalated" class="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-extrabold uppercase rounded">Escalated</span>
          </div>
          <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">{{ grievance.title }}</h1>
        </div>

        <div class="flex items-center space-x-2">
          <a routerLink="/tourist/dashboard" class="px-4 py-2 bg-[#0F172A] text-white rounded-xl text-xs font-bold hover:bg-slate-800 flex items-center space-x-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Dashboard</span>
          </a>
        </div>
      </div>

      <!-- Step-by-Step Workflow Timeline -->
      <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Live Lifecycle Timeline</h3>
        <app-workflow-timeline [grievance]="grievance"></app-workflow-timeline>
      </div>

      <!-- Main Content Grid -->
      <div class="grid lg:grid-cols-12 gap-8">
        
        <!-- Left 8 Cols: Grievance Details & Resolution Proof & Comments -->
        <div class="lg:col-span-8 space-y-8">
          
          <!-- Grievance Description Card -->
          <div class="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 class="font-bold text-slate-900 text-lg border-b border-slate-100 pb-3">Complaint Overview</h3>
            <p class="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{{ grievance.description }}</p>

            <div class="grid grid-cols-2 gap-4 text-xs pt-4 border-t border-slate-100">
              <div>
                <p class="text-slate-400 font-medium">Location</p>
                <p class="font-bold text-slate-800">{{ grievance.location }}</p>
              </div>
              <div>
                <p class="text-slate-400 font-medium">Filed Date</p>
                <p class="font-bold text-slate-800">{{ grievance.createdAt | date:'dd/MM/yyyy' }}</p>
              </div>
            </div>

            <!-- Evidence Attachments -->
            <div *ngIf="grievance.attachments && grievance.attachments.length > 0" class="pt-2">
              <p class="text-xs font-bold text-slate-500 uppercase mb-2">Submitted Evidence Files:</p>
              <div class="flex flex-wrap gap-2">
                <a *ngFor="let att of grievance.attachments" [href]="att.url" target="_blank" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-center space-x-1.5">
                  <span>{{ att.name }}</span>
                </a>
              </div>
            </div>
          </div>

          <!-- Official Resolution Card (If Resolved/Closed or Resolution Files Exist) -->
          <div *ngIf="grievance.resolutionDetails || (grievance.resolutionAttachments && grievance.resolutionAttachments.length > 0)" class="bg-emerald-50/80 p-6 sm:p-8 rounded-3xl border border-emerald-200 shadow-sm space-y-4">
            <div class="flex justify-between items-center border-b border-emerald-200 pb-3">
              <h3 class="font-extrabold text-emerald-900 text-lg">
                Official Report & Officer Attachment Proof
              </h3>
              <span *ngIf="grievance.resolvedAt" class="text-xs font-bold text-emerald-700">Resolved on {{ grievance.resolvedAt | date:'dd/MM/yyyy' }}</span>
            </div>

            <p *ngIf="grievance.resolutionDetails" class="text-sm text-emerald-950 leading-relaxed whitespace-pre-line">{{ grievance.resolutionDetails }}</p>

            <div *ngIf="grievance.resolutionAttachments && grievance.resolutionAttachments.length > 0" class="pt-2">
              <p class="text-xs font-bold text-emerald-800 uppercase mb-2">Resolution Attachments / Proof File Uploaded by Officer:</p>
              <div class="flex flex-wrap gap-2">
                <a *ngFor="let resAtt of grievance.resolutionAttachments" [href]="resAtt.url" target="_blank" class="px-3.5 py-2 bg-white border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center space-x-2 hover:bg-emerald-100 transition shadow-sm">
                  <span>{{ resAtt.name }}</span>
                  <span *ngIf="resAtt.size" class="text-[10px] text-emerald-600 font-semibold">({{ resAtt.size }})</span>
                </a>
              </div>
            </div>

            <!-- Rating Feedback Section -->
            <div *ngIf="!grievance.rating && (grievance.status === 'resolved' || grievance.status === 'closed')" class="pt-4 border-t border-emerald-200">
              <button (click)="isFeedbackModalOpen = true" class="w-full bg-emerald-700 text-white py-3 rounded-xl font-bold text-sm hover:bg-emerald-800 shadow-md">
                Provide Resolution Rating & Feedback
              </button>
            </div>

            <div *ngIf="grievance.rating" class="p-4 bg-white rounded-2xl border border-emerald-200 text-xs space-y-1">
              <p class="font-bold text-emerald-900">Your Submitted Feedback Rating:</p>
              <p class="text-amber-500 font-bold text-base">★ {{ grievance.rating }} / 5 Stars</p>
              <p class="text-slate-600 italic">"{{ grievance.feedbackComments }}"</p>
            </div>
          </div>

          <!-- Public Comments & Activity Feed -->
          <div class="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <h3 class="font-bold text-slate-900 text-lg border-b border-slate-100 pb-3">Public Updates & Discussion</h3>

            <!-- Comment List -->
            <div class="space-y-4">
              <div *ngFor="let c of grievanceService.getCommentsForGrievance(grievance.id)" class="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div class="flex justify-between items-center">
                  <span class="font-bold text-xs text-slate-900">{{ c.userName }}</span>
                  <span class="text-[10px] text-slate-400">{{ c.createdAt | date:'dd/MM/yyyy, hh:mm a' }}</span>
                </div>
                <p class="text-xs text-slate-700 leading-snug">{{ c.commentText }}</p>
              </div>

              <div *ngIf="grievanceService.getCommentsForGrievance(grievance.id).length === 0" class="text-xs text-slate-400 italic">
                No comments posted yet.
              </div>
            </div>

            <!-- Add Comment Box -->
            <div class="pt-4 border-t border-slate-100 space-y-2">
              <textarea 
                [(ngModel)]="newCommentText" 
                rows="2" 
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                spellcheck="false"
                data-lpignore="true"
                placeholder="Write a message..."
                class="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#A0C8C3]"
              ></textarea>

              <div *ngIf="authService.isAdmin() || authService.isOfficer()" class="flex items-center space-x-2">
                <input type="checkbox" id="detailInternalCheck" [(ngModel)]="isInternalComment" class="rounded text-teal-700 focus:ring-teal-500" />
                <label for="detailInternalCheck" class="text-xs text-slate-600 font-medium">Internal Note (Visible to Officers & Admin only)</label>
              </div>

              <button 
                (click)="postComment()" 
                [disabled]="!newCommentText.trim()"
                class="px-4 py-2 bg-[#0F172A] text-white rounded-xl text-xs font-bold hover:bg-slate-800 disabled:opacity-50"
              >
                Post Comment
              </button>
            </div>
          </div>

        </div>

        <!-- Right 4 Cols: Assignment Details & Actions -->
        <div class="lg:col-span-4 space-y-6">
          
          <!-- Assigned Department & Officer Widget -->
          <div class="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
            <h3 class="text-xs font-bold text-[#A0C8C3] uppercase tracking-wider">Assigned Department</h3>
            
            <div *ngIf="grievance.departmentName" class="space-y-3">
              <div>
                <p class="text-lg font-extrabold">{{ grievance.departmentName }}</p>
                <p class="text-xs text-slate-400">Officer: <strong class="text-white">{{ grievance.assignedOfficerName }}</strong></p>
              </div>

              <div class="p-3 bg-slate-800/60 rounded-xl text-xs space-y-1 border border-slate-700">
                <p class="text-slate-400">Official Helpline:</p>
                <p class="font-mono text-emerald-400 font-bold">{{ departmentHelpline }}</p>
              </div>
            </div>

            <div *ngIf="!grievance.departmentName" class="p-4 bg-slate-800/40 rounded-xl text-xs text-slate-400 italic">
              Pending review by Directorate Admin for department allocation.
            </div>
          </div>

          <!-- Action Box: Reopen & Feedback Buttons (Side-by-Side) -->
          <div *ngIf="grievance.status === 'resolved' || grievance.status === 'closed'" class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <h4 class="font-bold text-xs text-slate-700 uppercase">Resolution Feedback & Escalation Actions</h4>
            <p class="text-xs text-slate-500">Provide your resolution feedback rating or reopen this ticket if the resolution requires further action.</p>
            
            <div class="grid grid-cols-2 gap-3 pt-1">
              <button (click)="isReopenModalOpen = true" class="w-full py-2.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs hover:bg-rose-100 transition">
                Reopen Complaint
              </button>

              <button (click)="isFeedbackModalOpen = true" class="w-full py-2.5 bg-emerald-700 text-white rounded-xl font-bold text-xs hover:bg-emerald-800 transition flex items-center justify-center space-x-1 shadow-xs">
                <span>Give Feedback ★</span>
              </button>
            </div>

            <!-- Display Recorded Feedback & Rating if already submitted -->
            <div *ngIf="grievance.rating" class="mt-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-1.5">
              <div class="flex justify-between items-center">
                <span class="font-bold text-emerald-900 uppercase text-[10px]">Your Submitted Rating:</span>
                <span class="text-amber-500 font-extrabold text-sm">
                  {{ '★'.repeat(grievance.rating) }}{{ '☆'.repeat(5 - grievance.rating) }} ({{ grievance.rating }}/5)
                </span>
              </div>
              <p *ngIf="grievance.feedbackComments" class="text-slate-700 italic text-xs">"{{ grievance.feedbackComments }}"</p>
            </div>
          </div>

          <!-- Cancel Grievance Action Box -->
          <div *ngIf="canCancelGrievance()" class="bg-white p-6 rounded-3xl border border-rose-200 shadow-sm space-y-3">
            <h4 class="font-bold text-xs text-rose-700 uppercase">Cancel Grievance</h4>
            <p class="text-xs text-slate-500">If you no longer need this grievance to be processed, you can cancel it. This action can be undone by contacting the Admin.</p>
            <button 
              (click)="confirmCancelModal.set(true)" 
              [disabled]="isCancelling"
              class="w-full py-2.5 bg-rose-600 text-white rounded-xl font-bold text-xs hover:bg-rose-700 transition disabled:opacity-50"
            >
              {{ isCancelling ? 'Cancelling...' : 'Cancel This Grievance' }}
            </button>
          </div>

          <!-- Cancelled State Banner -->
          <div *ngIf="grievance.status === 'cancelled'" class="bg-rose-50 p-6 rounded-3xl border border-rose-200 shadow-sm text-center space-y-2">
            <p class="text-rose-800 font-bold text-sm">This grievance has been cancelled.</p>
            <p class="text-xs text-slate-500">Contact the Admin if you wish to reinstate this grievance.</p>
          </div>

        </div>

      </div>

      <!-- Feedback Rating Modal -->
      <div *ngIf="isFeedbackModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div class="bg-white rounded-3xl max-w-md w-full p-6 space-y-4">
          <h3 class="font-bold text-lg text-slate-900">Rate Grievance Resolution</h3>
          
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Satisfaction Rating</label>
            <div class="flex space-x-2">
              <button *ngFor="let star of [1,2,3,4,5]" (click)="selectedRating = star" [class.bg-amber-100]="selectedRating >= star" class="p-2 border rounded-xl text-amber-500 font-bold text-lg">
                ★
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Feedback Remarks</label>
            <textarea [(ngModel)]="feedbackComments" rows="3" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" placeholder="Enter your feedback remarks..." class="w-full px-4 py-2 border rounded-xl text-xs"></textarea>
          </div>

          <div class="flex space-x-2 pt-2">
            <button (click)="isFeedbackModalOpen = false" class="flex-1 bg-slate-100 py-2.5 rounded-xl text-xs font-bold text-slate-600">Cancel</button>
            <button (click)="submitFeedback()" class="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-xs font-bold">Submit Feedback</button>
          </div>
        </div>
      </div>

      <!-- Reopen Modal -->
      <div *ngIf="isReopenModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div class="bg-white rounded-3xl max-w-md w-full p-6 space-y-4">
          <h3 class="font-bold text-lg text-rose-700">Reopen Grievance Ticket</h3>
          <p class="text-xs text-slate-500">State your reason for reopening. This will immediately trigger an urgent officer escalation alert.</p>

          <textarea [(ngModel)]="reopenReason" rows="3" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" placeholder="Explain why the resolution was incomplete..." class="w-full px-4 py-2 border rounded-xl text-xs"></textarea>

          <div class="flex space-x-2 pt-2">
            <button (click)="isReopenModalOpen = false" class="flex-1 bg-slate-100 py-2.5 rounded-xl text-xs font-bold text-slate-600">Cancel</button>
            <button (click)="reopenGrievance()" class="flex-1 bg-rose-600 text-white py-2.5 rounded-xl text-xs font-bold">Confirm Reopen</button>
          </div>
        </div>
      </div>

      <!-- Cancel Grievance Confirmation Modal -->
      <div *ngIf="confirmCancelModal()" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
        <div class="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
          <div class="flex justify-between items-center border-b pb-3">
            <h3 class="font-bold text-base text-slate-900">Cancel Grievance Confirmation</h3>
            <button (click)="confirmCancelModal.set(false)" aria-label="Close dialog" class="text-slate-400 hover:text-slate-600 transition">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p class="text-xs text-slate-600">Are you sure you want to cancel this grievance? This will stop further processing.</p>
          <div class="flex space-x-2 pt-3 border-t">
            <button (click)="confirmCancelModal.set(false)" class="flex-1 bg-slate-100 py-2.5 rounded-xl text-xs font-bold text-slate-600">
              Go Back
            </button>
            <button 
              (click)="executeCancelGrievance()" 
              class="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl text-xs font-bold transition shadow-sm"
            >
              Yes, Cancel
            </button>
          </div>
        </div>
      </div>

    </div>
  `
})
export class GrievanceDetailComponent implements OnInit {
  route = inject(ActivatedRoute);
  grievanceService = inject(GrievanceService);
  departmentService = inject(DepartmentService);
  authService = inject(AuthService);

  grievance?: Grievance;
  isLoading = false;
  isCancelling = false;
  confirmCancelModal = signal<boolean>(false);

  async executeCancelGrievance() {
    this.confirmCancelModal.set(false);
    await this.cancelGrievance();
  }

  get departmentHelpline(): string {
    if (!this.grievance) return '—';
    const dept = this.departmentService.departments().find(
      d => d.id === this.grievance?.departmentId || d.name === this.grievance?.departmentName || d.name === this.grievance?.category
    );
    return dept?.contactPhone || '—';
  }
  newCommentText = '';
  isInternalComment = false;
  
  isFeedbackModalOpen = false;
  selectedRating = 5;
  feedbackComments = '';

  isReopenModalOpen = false;
  reopenReason = '';

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      // Try local cache first
      this.grievance = this.grievanceService.getGrievanceById(id);

      // If not in memory (e.g. direct URL refresh), fetch from backend
      if (!this.grievance) {
        this.isLoading = true;
        try {
          const fetched = await this.grievanceService.fetchGrievanceById(id);
          if (fetched) {
            this.grievance = fetched;
          }
        } catch (e) {
          console.warn('Failed to load grievance on direct navigation:', e);
        } finally {
          this.isLoading = false;
        }
      }
    }
  }

  canCancelGrievance(): boolean {
    if (!this.grievance) return false;
    const status = this.grievance.status;
    return status !== 'cancelled' && status !== 'closed' && status !== 'resolved';
  }

  async cancelGrievance() {
    if (!this.grievance || this.isCancelling) return;
    this.isCancelling = true;
    try {
      await this.grievanceService.cancelGrievance(this.grievance.id);
      this.grievance = this.grievanceService.getGrievanceById(this.grievance.id);
    } catch (e: any) {
      console.error('Cancel grievance error:', e);
    } finally {
      this.isCancelling = false;
    }
  }

  postComment() {
    if (!this.grievance || !this.newCommentText.trim()) return;
    this.grievanceService.addComment(this.grievance.id, this.newCommentText.trim(), this.isInternalComment);
    this.newCommentText = '';
    this.isInternalComment = false;
  }

  submitFeedback() {
    if (!this.grievance) return;
    this.grievanceService.submitFeedback(this.grievance.id, this.selectedRating, this.feedbackComments, true);
    this.isFeedbackModalOpen = false;
    this.grievance = this.grievanceService.getGrievanceById(this.grievance.id);
  }

  reopenGrievance() {
    if (!this.grievance || !this.reopenReason.trim()) return;
    this.grievanceService.reopenGrievance(this.grievance.id, this.reopenReason.trim());
    this.isReopenModalOpen = false;
    this.grievance = this.grievanceService.getGrievanceById(this.grievance.id);
  }
}
