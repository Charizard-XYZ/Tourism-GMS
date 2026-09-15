import { Component, inject, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GrievanceService } from '../../core/services/grievance.service';
import { AuthService } from '../../core/services/auth.service';
import { DepartmentService } from '../../core/services/department.service';
import { FirebaseService } from '../../core/services/firebase.service';
import { Grievance, GrievanceStatus, GrievanceAttachment } from '../../core/models/complaint.model';
import { StatusBadgeComponent } from '../../common/components/status-badge.component';
import { ToastComponent } from '../../common/components/toast.component';
import { IconComponent } from '../../common/components/icon.component';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

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
                    {{ getCommentAuthor(c) }} 
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
          
          <!-- Closed Grievance Warning — disables all processing actions -->
          <div *ngIf="isGrievanceClosed()" class="bg-slate-100 border border-slate-300 rounded-3xl p-5 flex items-start space-x-4">
            <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
              <app-icon name="check-circle" size="w-5 h-5" class="text-slate-700"></app-icon>
            </div>
            <div>
              <p class="text-xs font-extrabold text-slate-900 uppercase mb-1">Grievance Closed</p>
              <p class="text-xs text-slate-600">
                This grievance has been officially closed. It is kept for historical records and can no longer be processed or updated.
              </p>
            </div>
          </div>

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
          <div *ngIf="!isGrievanceCancelled() && !isGrievanceClosed() && !isAssignedToCurrentOfficer()" class="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex items-start space-x-4">
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
          <div *ngIf="!isGrievanceCancelled() && !isGrievanceClosed() && isDepartmentInactive()" class="bg-rose-50 border border-rose-200 rounded-3xl p-5 flex items-start space-x-4">
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

          <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6" [class.opacity-50]="isDepartmentInactive() || isGrievanceCancelled() || isGrievanceClosed() || !isAssignedToCurrentOfficer()" [class.pointer-events-none]="isDepartmentInactive() || isGrievanceCancelled() || isGrievanceClosed() || !isAssignedToCurrentOfficer()">
            <h3 class="font-bold text-slate-900 text-base border-b pb-2">Status & Resolution Controls</h3>

            <!-- Status Dropdown -->
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Update Complaint Status</label>
              <select [(ngModel)]="selectedStatus" class="w-full px-4 py-2.5 border rounded-xl text-xs font-bold">
                <option value="in_progress">In Progress (Under Inquiry)</option>
                <option value="resolved">Resolved (Complete)</option>
              </select>
            </div>

            <!-- Resolution Details & Inspection Proof Attachment (Visible ONLY when Resolved/Complete) -->
            <div *ngIf="selectedStatus === 'resolved'" class="space-y-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <!-- Official Resolution Report (Required when resolving) -->
              <div class="space-y-1">
                <label class="block text-xs font-extrabold text-emerald-900 uppercase">Official Resolution Report</label>
                <textarea [(ngModel)]="resolutionReport" rows="4" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" placeholder="Detail official findings, penalty issued, refund provided, or corrective action taken..." class="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs"></textarea>
              </div>

              <label class="block text-xs font-extrabold text-emerald-900 uppercase">Inspection Proof / Resolution Document</label>

              <!-- Hidden Real File Input -->
              <input 
                type="file" 
                #fileInput 
                (change)="onFileSelected($event)" 
                accept=".pdf,application/pdf,image/jpeg,image/png,image/webp" 
                class="hidden" 
              />

              <!-- ATTACH INSPECTION PROOF UI: Explicit States -->
              <div class="space-y-2">
                <!-- State 1: No file selected & not uploading -->
                <div *ngIf="!selectedFile && uploadState() !== 'uploading'" class="p-3 bg-white border border-emerald-300 rounded-xl space-y-2">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2 min-w-0">
                      <app-icon name="file-text" size="w-4 h-4" class="text-slate-400 shrink-0"></app-icon>
                      <span class="text-xs text-slate-600 font-medium">No file selected</span>
                    </div>
                    <button 
                      type="button" 
                      (click)="triggerFileInput()" 
                      class="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-800 transition inline-flex items-center space-x-1.5 shadow-xs"
                    >
                      <app-icon name="plus" size="w-3.5 h-3.5"></app-icon>
                      <span>Attach Proof / PDF</span>
                    </button>
                  </div>
                  <p class="text-[10px] text-emerald-700">Accepted: PDF (.pdf) or Images (.jpg, .png, .webp), max 10MB</p>
                </div>

                <!-- State 2: File selected (Pending automated upload on submit) -->
                <div *ngIf="selectedFile && uploadState() !== 'uploading'" class="p-3 bg-white border border-emerald-300 rounded-xl space-y-2">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2 min-w-0">
                      <app-icon name="file-text" size="w-4 h-4" class="text-emerald-700 shrink-0"></app-icon>
                      <div class="min-w-0">
                        <p class="text-xs font-bold text-slate-800 truncate">Selected: {{ selectedFile.name }}</p>
                        <p class="text-[10px] text-slate-500">{{ formatFileSize(selectedFile.size) }}</p>
                      </div>
                    </div>
                    <div class="flex items-center space-x-1 shrink-0">
                      <button 
                        type="button" 
                        (click)="triggerFileInput()" 
                        class="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition"
                        title="Change file"
                      >
                        Change
                      </button>
                      <button 
                        type="button" 
                        (click)="cancelSelectedFile()" 
                        class="text-slate-400 hover:text-rose-600 p-1" 
                        title="Remove selection"
                      >
                        <app-icon name="x" size="w-4 h-4"></app-icon>
                      </button>
                    </div>
                  </div>
                  <p class="text-[10px] text-emerald-700">Will be uploaded automatically when updating case status.</p>
                </div>

                <!-- State 3: Uploading (Progress) -->
                <div *ngIf="uploadState() === 'uploading'" class="p-3 bg-white border border-emerald-300 rounded-xl space-y-2">
                  <div class="flex items-center justify-between text-xs font-bold text-emerald-900">
                    <span class="inline-flex items-center space-x-1.5">
                      <app-icon name="loader" size="w-3.5 h-3.5" class="animate-spin text-emerald-700"></app-icon>
                      <span>Uploading proof... ({{ selectedFile?.name }})</span>
                    </span>
                    <span>{{ uploadProgress() }}%</span>
                  </div>
                  <div class="w-full bg-emerald-100 rounded-full h-2 overflow-hidden">
                    <div class="bg-emerald-600 h-2 rounded-full transition-all duration-200" [style.width.%]="uploadProgress()"></div>
                  </div>
                </div>

                <!-- State 4: Upload / Validation Failed Alert -->
                <div *ngIf="uploadErrorMessage()" class="p-2.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-xs text-rose-800 animate-fade-in">
                  <div class="flex items-start justify-between">
                    <div class="flex items-start space-x-1.5">
                      <app-icon name="alert-circle" size="w-4 h-4" class="text-rose-600 shrink-0 mt-0.5"></app-icon>
                      <div>
                        <p class="font-bold">File validation / upload error</p>
                        <p class="text-[11px] text-rose-700">{{ uploadErrorMessage() }}</p>
                      </div>
                    </div>
                    <button type="button" (click)="uploadErrorMessage.set('')" class="text-rose-400 hover:text-rose-700 p-1">
                      <app-icon name="x" size="w-3.5 h-3.5"></app-icon>
                    </button>
                  </div>
                  <div class="pt-1 flex justify-end">
                    <button type="button" (click)="triggerFileInput()" class="px-2.5 py-1 bg-white border border-rose-300 rounded-lg font-bold text-[11px] hover:bg-rose-100 transition">
                      Choose Another File
                    </button>
                  </div>
                </div>
              </div>

              <!-- Attached Resolution Proof Files List (Real uploaded references) -->
              <div *ngIf="resolutionFiles.length > 0 || (grievance.resolutionAttachments && grievance.resolutionAttachments.length > 0)" class="text-xs text-emerald-800 space-y-1.5 pt-1">
                <p class="font-bold text-[11px] text-emerald-900 uppercase">Attached Resolution Proof Files:</p>
                <div class="flex flex-wrap gap-2">
                  <div *ngFor="let f of (resolutionFiles.length > 0 ? resolutionFiles : grievance.resolutionAttachments); let idx = index" class="px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center space-x-2 hover:bg-emerald-100 transition shadow-sm">
                    <a [href]="f.url" target="_blank" class="hover:underline flex items-center space-x-1.5">
                      <span>{{ f.name }}</span>
                      <span *ngIf="f.size" class="text-[10px] text-emerald-600 font-semibold">({{ f.size }})</span>
                    </a>
                    <button 
                      *ngIf="resolutionFiles.length > 0 && !isGrievanceClosed() && !isGrievanceCancelled()" 
                      type="button" 
                      (click)="removeResolutionFile(idx)" 
                      class="text-slate-400 hover:text-rose-600 ml-1" 
                      title="Remove file"
                    >
                      <app-icon name="x" size="w-3 h-3"></app-icon>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button 
              (click)="saveStatusUpdate()" 
              [disabled]="isUpdatingStatus() || uploadState() === 'uploading' || isSuccess()"
              class="w-full bg-amber-500 text-slate-950 py-3 rounded-xl font-extrabold text-xs hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-md inline-flex items-center justify-center space-x-1.5 min-h-[44px] min-w-[260px]"
            >
              <app-icon *ngIf="uploadState() === 'uploading' || isUpdatingStatus()" name="loader" size="w-4 h-4" class="animate-spin shrink-0"></app-icon>
              <app-icon *ngIf="uploadState() !== 'uploading' && !isUpdatingStatus() && !isSuccess()" name="check-circle" size="w-4 h-4"></app-icon>
              <app-icon *ngIf="isSuccess()" name="check-circle" size="w-4 h-4" class="text-emerald-950"></app-icon>
              <span>{{ mainButtonLabel() }}</span>
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
  firebaseService = inject(FirebaseService);

  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  grievance?: Grievance;
  selectedStatus: GrievanceStatus = 'in_progress';
  resolutionReport = '';
  resolutionFiles: GrievanceAttachment[] = [];
  
  noteText = '';
  isInternalOnly = true;

  toastMessage = signal<string | null>(null);

  // File Upload Reactive State
  selectedFile: File | null = null;
  uploadState = signal<'idle' | 'selected' | 'uploading' | 'error'>('idle');
  uploadProgress = signal<number>(0);
  uploadErrorMessage = signal<string>('');
  isSuccess = signal<boolean>(false);

  getCommentAuthor(c: any): string {
    return this.grievanceService.getCommentAuthor(c);
  }

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
        if (this.grievance.resolutionAttachments && this.grievance.resolutionAttachments.length > 0) {
          this.resolutionFiles = [...this.grievance.resolutionAttachments];
        }
      }
    }
  }

  isGrievanceCancelled(): boolean {
    return this.grievance?.status === 'cancelled';
  }

  isGrievanceClosed(): boolean {
    return this.grievance?.status === 'closed';
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
    if (this.isGrievanceCancelled() || this.isGrievanceClosed()) {
      this.toastMessage.set('Closed or cancelled grievances cannot be updated or processed.');
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

  triggerFileInput(): void {
    if (this.fileInputRef && this.fileInputRef.nativeElement) {
      this.fileInputRef.nativeElement.click();
    }
  }

  formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    this.uploadErrorMessage.set('');

    // Allowed inspection proof file types: PDF and images (JPEG, PNG, WebP)
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];

    const isTypeAllowed = allowedTypes.includes(file.type) || allowedExtensions.includes(extension);

    if (!isTypeAllowed) {
      this.selectedFile = null;
      this.uploadState.set('error');
      this.uploadErrorMessage.set(`Unsupported file format (.${extension || 'unknown'}). Allowed: PDF (.pdf), JPEG (.jpg), PNG (.png), or WebP (.webp).`);
      input.value = '';
      return;
    }

    // Maximum file size: 10 MB
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      this.selectedFile = null;
      this.uploadState.set('error');
      this.uploadErrorMessage.set(`File size exceeds 10 MB limit (${this.formatFileSize(file.size)}). Please select a smaller file.`);
      input.value = '';
      return;
    }

    this.selectedFile = file;
    this.uploadState.set('selected');
    this.uploadProgress.set(0);
  }

  cancelSelectedFile(): void {
    this.selectedFile = null;
    this.uploadState.set('idle');
    this.uploadProgress.set(0);
    this.uploadErrorMessage.set('');
    if (this.fileInputRef && this.fileInputRef.nativeElement) {
      this.fileInputRef.nativeElement.value = '';
    }
  }

  removeResolutionFile(index: number): void {
    if (this.isGrievanceClosed() || this.isGrievanceCancelled()) return;
    this.resolutionFiles.splice(index, 1);
  }

  mainButtonLabel(): string {
    if (this.isSuccess()) {
      return 'Case updated and tourist notified';
    }
    if (this.uploadState() === 'uploading') {
      return 'Uploading proof...';
    }
    if (this.isUpdatingStatus()) {
      return 'Updating Case...';
    }
    return 'Update Case Status & Notify Tourist';
  }

  async saveStatusUpdate(): Promise<void> {
    if (!this.grievance || this.isUpdatingStatus() || this.uploadState() === 'uploading' || this.isSuccess()) return;

    if (this.isGrievanceCancelled()) {
      this.toastMessage.set('Cancelled grievances cannot be updated or processed.');
      return;
    }
    if (this.isGrievanceClosed()) {
      this.toastMessage.set('This grievance has been closed and cannot be modified.');
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
    // BUSINESS RULE: Officers cannot set status to 'closed' or 'assigned'
    if (this.selectedStatus === 'closed' || this.selectedStatus === 'assigned') {
      this.toastMessage.set('Officers cannot set grievance status to closed or assigned.');
      return;
    }

    // Check whether a proof file and resolution report are required
    if (this.selectedStatus === 'resolved') {
      if (!this.resolutionReport || !this.resolutionReport.trim()) {
        this.toastMessage.set('Official resolution report is required when resolving a grievance.');
        return;
      }

      const hasExistingProof = (this.resolutionFiles && this.resolutionFiles.length > 0) ||
                               (this.grievance.resolutionAttachments && this.grievance.resolutionAttachments.length > 0);
      const hasSelectedFile = !!this.selectedFile;

      if (!hasExistingProof && !hasSelectedFile) {
        this.toastMessage.set('A proof file is required when marking a grievance as resolved. Please attach an inspection proof or PDF report.');
        return;
      }
    }

    // AUTO-UPLOAD WORKFLOW: If a real proof file has been selected, upload it automatically
    let uploadedAttachments = [...this.resolutionFiles];
    if (this.selectedFile) {
      const fileToUpload = this.selectedFile;
      const grievanceId = this.grievance.id;
      const sanitizedName = fileToUpload.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `inspection-proofs/${grievanceId}/${Date.now()}_${sanitizedName}`;

      this.uploadState.set('uploading');
      this.uploadProgress.set(10);
      this.uploadErrorMessage.set('');

      try {
        let downloadUrl = '';
        let attachmentSize = this.formatFileSize(fileToUpload.size);
        let attachmentType = fileToUpload.type || 'application/pdf';

        try {
          const storageRef = ref(this.firebaseService.storage, storagePath);
          const uploadTask = uploadBytesResumable(storageRef, fileToUpload, {
            contentType: fileToUpload.type || 'application/pdf',
            customMetadata: {
              grievanceId,
              officerUid: this.authService.currentUser()?.uid || '',
              originalName: fileToUpload.name
            }
          });

          await new Promise<void>((resolve, reject) => {
            uploadTask.on(
              'state_changed',
              (snapshot) => {
                const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                this.uploadProgress.set(Math.max(10, Math.min(95, progress)));
              },
              (error) => {
                reject(error);
              },
              () => {
                resolve();
              }
            );
          });

          downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
        } catch (directStorageErr: any) {
          const errCode = directStorageErr?.code || '';
          const errMsg = directStorageErr?.message || '';
          const isBucketUnavailable = errCode === 'storage/unknown' ||
                                      errCode === 'storage/retry-limit-exceeded' ||
                                      errCode === 'storage/object-not-found' ||
                                      errMsg.includes('404') ||
                                      errMsg.includes('bucket') ||
                                      errMsg.includes('absent') ||
                                      errMsg.includes('backend upload');

          if (isBucketUnavailable && typeof this.grievanceService.uploadProofFile === 'function') {
            console.warn('Direct Firebase Storage bucket unavailable, utilizing authorized backend upload:', directStorageErr);
            this.uploadProgress.set(50);
            const backendAttachment = await this.grievanceService.uploadProofFile(grievanceId, fileToUpload);
            downloadUrl = backendAttachment.url;
            attachmentSize = backendAttachment.size || attachmentSize;
            attachmentType = backendAttachment.type || attachmentType;
          } else {
            throw directStorageErr;
          }
        }

        this.uploadProgress.set(100);

        const newAttachment: GrievanceAttachment = {
          name: fileToUpload.name,
          url: downloadUrl,
          size: attachmentSize,
          type: attachmentType
        };

        uploadedAttachments.push(newAttachment);
        this.resolutionFiles = [...uploadedAttachments];
        this.selectedFile = null;
        this.uploadState.set('idle');

        if (this.fileInputRef && this.fileInputRef.nativeElement) {
          this.fileInputRef.nativeElement.value = '';
        }
      } catch (uploadErr: any) {
        console.error('Failed to upload inspection proof:', uploadErr);
        this.uploadState.set('error');
        this.uploadErrorMessage.set(uploadErr?.message || 'Failed to upload proof file. Please check your connection and retry.');
        this.toastMessage.set('Failed to upload proof file. Please retry.');
        // Do NOT proceed to update status or notify tourist; keep selectedFile for retry
        return;
      }
    }

    this.isUpdatingStatus.set(true);
    try {
      await this.grievanceService.updateStatus(
        this.grievance.id,
        this.selectedStatus,
        this.resolutionReport.trim(),
        uploadedAttachments
      );

      this.isSuccess.set(true);
      this.toastMessage.set('Case updated and tourist notified');

      setTimeout(() => {
        this.isUpdatingStatus.set(false);
        this.router.navigate(['/officer/dashboard']);
      }, 1500);
    } catch (err: any) {
      this.isUpdatingStatus.set(false);
      this.toastMessage.set(err?.message || 'Failed to update case status.');
    }
  }
}
