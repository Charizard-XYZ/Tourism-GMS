import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GrievanceService } from '../../core/services/grievance.service';
import { AuthService } from '../../core/services/auth.service';
import { DepartmentService } from '../../core/services/department.service';
import { GrievanceCategory } from '../../core/models/complaint.model';
import { ToastComponent } from '../../common/components/toast.component';
import { capitalizeFirstChar } from '../../core/directives/capitalize-first.directive';

@Component({
  selector: 'app-grievance-submission',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastComponent],
  template: `
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      <div class="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-200 space-y-8">
        
        <!-- Form Header -->
        <div class="border-b border-slate-100 pb-6">
          <div class="inline-flex items-center space-x-2 px-3 py-1 bg-[#A0C8C3]/20 text-teal-800 rounded-full text-xs font-bold uppercase mb-2">
            <span>Official Redressal Form</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Lodge Tourist Grievance
          </h1>
          <p class="text-xs sm:text-sm text-slate-500 mt-1">
            Fill out the details below. Your grievance will be immediately assigned to a Officer under official guidelines.
          </p>
        </div>

        <form (submit)="onSubmit()" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" class="space-y-6">
          
          <!-- Category / Department (Only Active Admin Created Departments) -->
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-2">Target Department *</label>
            <div *ngIf="activeDepartments().length === 0" class="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-semibold mb-2">
              No active departments are currently available to accept grievances. Please check back later.
            </div>
            <select [(ngModel)]="departmentId" name="departmentId" required [disabled]="activeDepartments().length === 0" class="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#A0C8C3] bg-white">
              <option value="" disabled>-- Select Active Department --</option>
              <option *ngFor="let d of activeDepartments()" [value]="d.id">
                {{ d.name }} ({{ d.code }})
              </option>
            </select>
            <p *ngIf="hasSubmitted && !departmentId.trim()" class="text-[11px] text-rose-600 font-bold mt-1">Please select an active department.</p>
          </div>

          <!-- Title -->
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-2">Grievance Title *</label>
            <input 
              type="text" 
              [ngModel]="title" 
              (ngModelChange)="onTitleChange($event)"
              name="grv_title_summary" 
              required 
              autocomplete="one-time-code"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              data-lpignore="true"
              placeholder="Enter Grievance title"
              class="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#A0C8C3]"
            />
            <p *ngIf="hasSubmitted && !title.trim()" class="text-[11px] text-rose-600 font-bold mt-1">Please enter a grievance title.</p>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-2">Detailed Complaint Description *</label>
            <textarea 
              [(ngModel)]="description" 
              name="description" 
              rows="5" 
              required 
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              data-lpignore="true"
              placeholder="Provide exact details (e.g. date, time, name and everything about your grievance)"
              class="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#A0C8C3]"
            ></textarea>
            <p *ngIf="hasSubmitted && !description.trim()" class="text-[11px] text-rose-600 font-bold mt-1">Please provide a detailed description of your grievance.</p>
          </div>

          <!-- Location -->
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-2">Exact Location / Address *</label>
            <input 
              type="text" 
              [(ngModel)]="location" 
              name="location" 
              required 
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              data-lpignore="true"
              placeholder="Enter location"
              class="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#A0C8C3]"
            />
            <p *ngIf="hasSubmitted && !location.trim()" class="text-[11px] text-rose-600 font-bold mt-1">Please specify the location.</p>
          </div>

          <div class="pt-4 border-t border-slate-100 flex justify-end space-x-3">
            <a routerLink="/tourist/dashboard" class="px-6 py-3.5 bg-slate-100 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-200 transition">
              Cancel
            </a>
            <button 
              type="submit" 
              [disabled]="isSubmitting() || activeDepartments().length === 0"
              class="px-8 py-3.5 bg-[#0F172A] text-white font-extrabold text-sm rounded-xl hover:bg-slate-800 transition shadow-lg disabled:opacity-50"
            >
              {{ isSubmitting() ? 'Submitting Grievance...' : 'Submit Official Grievance' }}
            </button>
          </div>

        </form>

      </div>

      <app-toast [message]="toastMessage()" (dismiss)="toastMessage.set(null)"></app-toast>

    </div>
  `
})
export class GrievanceSubmissionComponent {
  grievanceService = inject(GrievanceService);
  departmentService = inject(DepartmentService);
  authService = inject(AuthService);
  router = inject(Router);

  departmentId: string = '';
  title = '';
  description = '';
  location = '';
  hasSubmitted = false;

  onTitleChange(val: string) {
    this.title = capitalizeFirstChar(val);
  }

  isSubmitting = signal<boolean>(false);
  toastMessage = signal<string | null>(null);

  activeDepartments() {
    return this.departmentService.departments().filter(d => d.isActive);
  }

  constructor() {
    const depts = this.activeDepartments();
    if (depts.length > 0) {
      this.departmentId = depts[0].id;
    }
  }

  async onSubmit() {
    this.hasSubmitted = true;
    if (!this.departmentId.trim() || !this.title.trim() || !this.description.trim() || !this.location.trim()) {
      this.toastMessage.set('Please fill out all required fields.');
      return;
    }

    const matchedDept = this.departmentService.departments().find(d => d.id === this.departmentId && d.isActive);
    if (!matchedDept) {
      this.toastMessage.set('Selected department is inactive or not found. Please select an active department.');
      return;
    }

    this.isSubmitting.set(true);
    const user = this.authService.currentUser();
    if (!user) {
      this.isSubmitting.set(false);
      this.toastMessage.set('Authentication session missing. Please sign in again.');
      return;
    }

    try {
      const newGrievance = await this.grievanceService.submitGrievance({
        title: this.title.trim(),
        description: this.description.trim(),
        category: matchedDept.name as GrievanceCategory,
        departmentId: matchedDept.id,
        departmentName: matchedDept.name,
        location: this.location.trim(),
        touristLocationName: 'Central Region',
        touristId: user.uid,
        touristName: user.displayName,
        touristEmail: user.email,
        touristPhone: user.phoneNumber,
        attachments: []
      });

      this.isSubmitting.set(false);
      const code = (newGrievance as any).grievanceCode || newGrievance.trackingCode;
      this.toastMessage.set(`Grievance ${code} successfully lodged!`);

      setTimeout(() => {
        this.router.navigate(['/tourist/dashboard']);
      }, 1500);
    } catch (err: any) {
      this.isSubmitting.set(false);
      this.toastMessage.set(err.message || 'Failed to lodge grievance.');
    }
  }
}
