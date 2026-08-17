import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GrievanceService } from '../../core/services/grievance.service';
import { AuthService } from '../../core/services/auth.service';
import { Grievance, GrievanceStatus } from '../../core/models/complaint.model';
import { StatusBadgeComponent } from '../../common/components/status-badge.component';
import { ToastComponent } from '../../common/components/toast.component';

@Component({
  selector: 'app-grievance-processing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusBadgeComponent, ToastComponent],
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

        <a routerLink="/officer/dashboard" class="px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-700">
          ← Officer Desk
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
                <p class="font-bold text-slate-900">{{ grievance.citizenName }}</p>
                <p class="text-[11px] text-slate-500">{{ grievance.citizenPhone || grievance.citizenEmail }}</p>
              </div>
              <div>
                <p class="text-slate-400">Incident Location</p>
                <p class="font-bold text-slate-900">📍 {{ grievance.location }}</p>
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
                <button (click)="postNote()" [disabled]="!noteText.trim()" class="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800">
                  Save Note
                </button>
              </div>
            </div>
          </div>

        </div>

        <!-- Right 5 Cols: Officer Action Control Panel -->
        <div class="lg:col-span-5 space-y-6">
          
          <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
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
            <div *ngIf="selectedStatus === 'resolved'" class="space-y-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <label class="block text-xs font-extrabold text-emerald-900 uppercase">Official Resolution Report *</label>
              <textarea [(ngModel)]="resolutionReport" rows="4" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" placeholder="Detail official findings, penalty issued, refund provided, or corrective action taken..." class="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs"></textarea>

              <button type="button" (click)="simulateResolutionProof()" class="w-full py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-emerald-800 hover:bg-emerald-100">
                + Attach Inspection Proof / PDF
              </button>

              <div *ngIf="resolutionFiles.length > 0" class="text-xs text-emerald-800">
                <span *ngFor="let f of resolutionFiles">📄 {{ f.name }}</span>
              </div>
            </div>

            <button (click)="saveStatusUpdate()" class="w-full bg-amber-500 text-slate-950 py-3 rounded-xl font-extrabold text-xs hover:bg-amber-400 shadow-md">
              Update Case Status & Notify Tourist
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

  grievance?: Grievance;
  selectedStatus: GrievanceStatus = 'in_progress';
  resolutionReport = '';
  resolutionFiles: any[] = [];
  
  noteText = '';
  isInternalOnly = true;

  toastMessage = signal<string | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.grievance = this.grievanceService.getGrievanceById(id);
      if (this.grievance) {
        this.selectedStatus = this.grievance.status;
        this.resolutionReport = this.grievance.resolutionDetails || '';
      }
    }
  }

  postNote() {
    if (!this.grievance || !this.noteText.trim()) return;
    this.grievanceService.addComment(this.grievance.id, this.noteText.trim(), this.isInternalOnly);
    this.noteText = '';
  }

  simulateResolutionProof() {
    this.resolutionFiles.push({
      name: `Officer_Inspection_Report_${Date.now().toString().slice(-4)}.pdf`,
      url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600',
      size: '920 KB',
      type: 'application/pdf'
    });
  }

  saveStatusUpdate() {
    if (!this.grievance) return;
    this.grievanceService.updateStatus(this.grievance.id, this.selectedStatus, this.resolutionReport, this.resolutionFiles);
    this.toastMessage.set(`Case status updated to ${this.selectedStatus.toUpperCase()}`);
    
    setTimeout(() => {
      this.router.navigate(['/officer/dashboard']);
    }, 1200);
  }
}
