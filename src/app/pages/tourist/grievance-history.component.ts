import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GrievanceService } from '../../core/services/grievance.service';
import { DepartmentService } from '../../core/services/department.service';
import { StatusBadgeComponent } from '../../common/components/status-badge.component';
import { ToastComponent } from '../../common/components/toast.component';
import { capitalizeFirstChar } from '../../core/directives/capitalize-first.directive';

@Component({
  selector: 'app-grievance-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusBadgeComponent, ToastComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-900">Grievance History Log</h1>
          <p class="text-xs text-slate-500">Searchable repository of all your lodged complaints and statuses</p>
        </div>
        <a routerLink="/tourist/submit" class="px-5 py-2.5 bg-[#0F172A] text-white rounded-xl text-xs font-bold hover:bg-slate-800">
          File Grievance
        </a>
      </div>

      <!-- Filters Bar -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid sm:grid-cols-3 gap-4">
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input 
            type="text" 
            [ngModel]="searchKeyword" 
            (ngModelChange)="onSearchChange($event)"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            data-lpignore="true"
            placeholder="Search by code or title..." 
            class="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#A0C8C3]"
          />
        </div>

        <select [(ngModel)]="statusFilter" class="px-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#A0C8C3]">
          <option value="ALL">All Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="reopened">Reopened</option>
          <option value="cancelled">Cancelled</option>
          <option value="closed">Closed</option>
        </select>

        <select [(ngModel)]="categoryFilter" class="px-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#A0C8C3]">
          <option value="ALL">All Department Categories</option>
          <option *ngFor="let d of departmentService.departments()" [value]="d.name">
            {{ d.name }} ({{ d.code }})
          </option>
        </select>
      </div>

      <!-- History Table -->
      <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th class="p-4">Grievance Code</th>
                <th class="p-4">Title & Details</th>
                <th class="p-4">Category</th>
                <th class="p-4">Filed Date</th>
                <th class="p-4">Status</th>
                <th class="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              <tr *ngFor="let g of filteredGrievances()" class="hover:bg-slate-50 transition">
                <td class="p-4 font-mono font-bold text-slate-800">{{ g.grievanceCode || g.trackingCode }}</td>
                <td class="p-4 max-w-xs">
                  <p class="font-bold text-slate-900 truncate">{{ g.title }}</p>
                  <p class="text-[11px] text-slate-400 truncate">{{ g.location }}</p>
                </td>
                <td class="p-4 text-slate-600">{{ g.category }}</td>
                <td class="p-4 text-slate-500">{{ g.createdAt | date:'dd/MM/yyyy' }}</td>
                <td class="p-4 space-x-1">
                  <app-status-badge [status]="g.status"></app-status-badge>
                </td>
                <td class="p-4 text-right space-x-1.5 whitespace-nowrap">
                  <a [routerLink]="['/tourist/grievance', g.id]" class="px-3 py-1.5 bg-[#A0C8C3] text-slate-950 font-bold rounded-lg text-xs hover:bg-teal-300 inline-flex items-center space-x-1">
                    <span>View</span>
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </a>
                  <button *ngIf="g.status === 'cancelled'" (click)="targetGrievanceToDelete = g" class="px-3 py-1.5 bg-rose-100 text-rose-700 font-bold rounded-lg text-xs hover:bg-rose-200 inline-flex items-center space-x-1">
                    <span>Delete</span>
                  </button>
                </td>
              </tr>

              <tr *ngIf="filteredGrievances().length === 0">
                <td colspan="6" class="p-8 text-center text-slate-400">No grievances match the search filter criteria.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Delete Grievance Confirmation Modal -->
      <div *ngIf="targetGrievanceToDelete" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
        <div class="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
          <div class="flex justify-between items-center border-b pb-3">
            <h3 class="font-bold text-base text-slate-900">Delete Grievance Confirmation</h3>
            <button (click)="targetGrievanceToDelete = null" aria-label="Close dialog" class="text-slate-400 hover:text-slate-600 transition">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p class="text-xs text-slate-600">Are you sure you want to delete this grievance?</p>
          <div class="flex space-x-2 pt-3 border-t">
            <button (click)="targetGrievanceToDelete = null" class="flex-1 bg-slate-100 py-2.5 rounded-xl text-xs font-bold text-slate-600">
              Go Back
            </button>
            <button 
              (click)="executeDelete()" 
              [disabled]="isDeleting"
              class="flex-1 bg-rose-700 hover:bg-rose-800 text-white py-2.5 rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
            >
              {{ isDeleting ? 'Deleting grievance...' : 'Yes, Delete' }}
            </button>
          </div>
        </div>
      </div>

      <app-toast [message]="toastMessage()" (dismiss)="toastMessage.set(null)"></app-toast>

    </div>
  `
})
export class GrievanceHistoryComponent implements OnInit {
  grievanceService = inject(GrievanceService);
  departmentService = inject(DepartmentService);

  searchKeyword = '';
  statusFilter = 'ALL';
  categoryFilter = 'ALL';

  targetGrievanceToDelete: any = null;
  isDeleting = false;
  toastMessage = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.grievanceService.loadGrievancesFromBackend();
  }

  async executeDelete(): Promise<void> {
    if (!this.targetGrievanceToDelete || this.isDeleting) return;
    const id = this.targetGrievanceToDelete.id;
    this.targetGrievanceToDelete = null;
    this.isDeleting = true;
    try {
      await this.grievanceService.deleteGrievance(id);
      this.toastMessage.set('Grievance deleted successfully.');
    } catch (e: any) {
      console.error('Delete grievance error:', e);
      this.toastMessage.set('Unable to delete grievance. Please try again.');
    } finally {
      this.isDeleting = false;
    }
  }

  onSearchChange(val: string) {
    this.searchKeyword = capitalizeFirstChar(val);
  }

  filteredGrievances() {
    const kw = this.searchKeyword.toLowerCase().trim();
    return this.grievanceService.roleGrievances().filter(g => {
      const matchesSearch = !kw || 
        g.trackingCode.toLowerCase().includes(kw) || 
        ((g as any).grievanceCode && (g as any).grievanceCode.toLowerCase().includes(kw)) ||
        g.title.toLowerCase().includes(kw);
      
      const matchesStatus = this.statusFilter === 'ALL' || g.status === this.statusFilter;
      const matchesCategory = this.categoryFilter === 'ALL' || g.category === this.categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }
}
