import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GrievanceService } from '../../core/services/grievance.service';
import { DepartmentService } from '../../core/services/department.service';
import { AuthService } from '../../core/services/auth.service';
import { StatusBadgeComponent } from '../../common/components/status-badge.component';
import { IconComponent } from '../../common/components/icon.component';
import { capitalizeFirstChar } from '../../core/directives/capitalize-first.directive';

@Component({
  selector: 'app-grievance-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusBadgeComponent, IconComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-900">Grievance History Log</h1>
          <p class="text-xs text-slate-500">Searchable repository of all your lodged complaints and statuses</p>
        </div>
        <a routerLink="/tourist/submit" class="px-5 py-2.5 bg-[#0F172A] text-white rounded-xl text-xs font-bold hover:bg-slate-800 inline-flex items-center space-x-1.5">
          <app-icon name="plus" size="w-3.5 h-3.5"></app-icon>
          <span>File Grievance</span>
        </a>
      </div>

      <!-- Filters Bar -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid sm:grid-cols-3 gap-4">
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <app-icon name="search" size="w-4 h-4"></app-icon>
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
          <option value="closed">Closed</option>
          <option value="cancelled">Cancelled</option>
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
                    <app-icon name="eye" size="w-3.5 h-3.5"></app-icon>
                  </a>
                  <button *ngIf="canDelete(g)" (click)="targetGrievanceToDelete = g" [disabled]="isDeleting" class="px-3 py-1.5 bg-rose-100 text-rose-700 font-bold rounded-lg text-xs hover:bg-rose-200 inline-flex items-center space-x-1 disabled:opacity-50">
                    <app-icon name="trash" size="w-3.5 h-3.5"></app-icon>
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
      <div *ngIf="targetGrievanceToDelete" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
        <div class="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-modal-pop">
          <div class="flex justify-between items-center border-b pb-3">
            <h3 class="font-bold text-base text-slate-900">Delete Grievance Confirmation</h3>
            <button (click)="targetGrievanceToDelete = null" [disabled]="isDeleting" aria-label="Close dialog" class="text-slate-400 hover:text-slate-600 transition disabled:opacity-50">
              <app-icon name="x" size="w-5 h-5"></app-icon>
            </button>
          </div>
          <p class="text-xs text-slate-600">Are you sure you want to permanently delete this cancelled grievance? This action cannot be undone.</p>
          <div class="flex space-x-2 pt-3 border-t">
            <button (click)="targetGrievanceToDelete = null" [disabled]="isDeleting" class="flex-1 bg-slate-100 py-2.5 rounded-xl text-xs font-bold text-slate-600 disabled:opacity-50">
              Go Back
            </button>
            <button 
              (click)="executeDelete()" 
              [disabled]="isDeleting"
              class="flex-1 bg-rose-700 hover:bg-rose-800 text-white py-2.5 rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center space-x-1.5 min-h-[40px] min-w-[120px]"
            >
              <app-icon *ngIf="isDeleting" name="loader" size="w-3.5 h-3.5" class="animate-spin shrink-0"></app-icon>
              <app-icon *ngIf="!isDeleting" name="trash" size="w-3.5 h-3.5"></app-icon>
              <span>{{ isDeleting ? 'Deleting...' : 'Yes, Delete' }}</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  `
})
export class GrievanceHistoryComponent implements OnInit {
  grievanceService = inject(GrievanceService);
  departmentService = inject(DepartmentService);
  authService = inject(AuthService);

  searchKeyword = '';
  statusFilter = 'ALL';
  categoryFilter = 'ALL';

  targetGrievanceToDelete: any = null;
  isDeleting = false;

  async ngOnInit(): Promise<void> {
    await this.grievanceService.loadGrievancesFromBackend();
  }

  canDelete(g: any): boolean {
    const user = this.authService.currentUser();
    if (!user) return false;
    // Strictly Tourist owner only and only after cancellation. Admin cannot delete grievances.
    if (user.role !== 'tourist') return false;
    const isOwner = Boolean(g.touristId === user.uid || (user.email && g.touristEmail === user.email));
    return isOwner && g.status === 'cancelled';
  }

  async executeDelete(): Promise<void> {
    if (!this.targetGrievanceToDelete || !this.canDelete(this.targetGrievanceToDelete) || this.isDeleting) return;
    const id = this.targetGrievanceToDelete.id;
    this.isDeleting = true;
    try {
      await this.grievanceService.deleteGrievance(id);
    } catch (e: any) {
      console.error('Delete grievance error:', e);
    } finally {
      this.isDeleting = false;
      this.targetGrievanceToDelete = null;
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
