import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GrievanceService } from '../../core/services/grievance.service';
import { AuthService } from '../../core/services/auth.service';
import { DepartmentService } from '../../core/services/department.service';
import { GrievanceCategory } from '../../core/models/complaint.model';
import { ToastComponent } from '../../common/components/toast.component';

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
          
          <!-- Category Grid (Dynamically linked with Active Admin Created Departments) -->
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-2">Department Category *</label>
            <select [(ngModel)]="category" name="category" required class="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#A0C8C3]">
              <option *ngFor="let d of activeDepartments()" [value]="d.name">
                {{ d.name }} ({{ d.code }})
              </option>
              <option *ngIf="activeDepartments().length === 0" value="General Tourism">
                --SELECT--
              </option>
            </select>
          </div>

          <!-- Title -->
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-2">Grievance Title *</label>
            <input 
              type="text" 
              [(ngModel)]="title" 
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
            <p *ngIf="hasSubmitted && !location.trim()" class="text-[11px] text-rose-600 font-bold mt-1">Please enter the exact location or address.</p>
          </div>

          <!-- Submit Action Button -->
          <div class="pt-4 flex justify-end space-x-4">
            <button 
              type="button" 
              (click)="router.navigate(['/citizen/dashboard'])"
              class="px-6 py-3 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              [disabled]="isSubmitting()"
              class="px-8 py-3.5 bg-[#0F172A] text-white rounded-xl text-sm font-extrabold hover:bg-slate-800 transition shadow-xl"
            >
              {{ isSubmitting() ? 'Submitting Grievance...' : 'Submit Official Grievance →' }}
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

  category: string = '';
  title = '';
  description = '';
  location = '';
  hasSubmitted = false;

  isSubmitting = signal<boolean>(false);
  toastMessage = signal<string | null>(null);

  activeDepartments() {
    return this.departmentService.departments().filter(d => d.isActive);
  }

  constructor() {
    const depts = this.activeDepartments();
    if (depts.length > 0) {
      this.category = depts[0].name;
    } else {
      this.category = 'General Tourism';
    }
  }

  async onSubmit() {
    this.hasSubmitted = true;
    if (!this.title.trim() || !this.description.trim() || !this.location.trim()) {
      this.toastMessage.set('Please fill out all required fields.');
      return;
    }

    this.isSubmitting.set(true);
    const user = this.authService.currentUser();
    if (!user) return;

    const selectedCategory = this.category || (this.activeDepartments()[0]?.name || 'General Tourism');
    const matchedDept = this.departmentService.departments().find(d => d.name === selectedCategory);

    const newGrievance = await this.grievanceService.submitGrievance({
      title: this.title,
      description: this.description,
      category: selectedCategory as GrievanceCategory,
      departmentId: matchedDept?.id || 'dept-001',
      departmentName: matchedDept?.name || selectedCategory,
      location: this.location,
      touristLocationName: 'Central Region',
      citizenId: user.uid,
      citizenName: user.displayName,
      citizenEmail: user.email,
      citizenPhone: user.phoneNumber,
      attachments: []
    });

    this.isSubmitting.set(false);
    this.toastMessage.set(`Grievance ${newGrievance.trackingCode} successfully lodged!`);

    setTimeout(() => {
      this.router.navigate(['/citizen/grievance', newGrievance.id]);
    }, 1200);
  }
}
