import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GrievanceService } from '../../core/services/grievance.service';
import { DepartmentService } from '../../core/services/department.service';
import { StatusBadgeComponent } from '../../common/components/status-badge.component';

@Component({
  selector: 'app-grievance-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusBadgeComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-900">Grievance History Log</h1>
          <p class="text-xs text-slate-500">Searchable repository of all your lodged complaints and statuses</p>
        </div>
        <a routerLink="/citizen/submit" class="px-5 py-2.5 bg-[#0F172A] text-white rounded-xl text-xs font-bold hover:bg-slate-800">
          File Grievance
        </a>
      </div>

      <!-- Filters Bar -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid sm:grid-cols-3 gap-4">
        <input 
          type="text" 
          [(ngModel)]="searchKeyword" 
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          data-lpignore="true"
          placeholder="Search by code or title..." 
          class="px-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#A0C8C3]"
        />

        <select [(ngModel)]="statusFilter" class="px-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#A0C8C3]">
          <option value="ALL">All Statuses</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
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
                <th class="p-4">Tracking Code</th>
                <th class="p-4">Title & Details</th>
                <th class="p-4">Category</th>
                <th class="p-4">Filed Date</th>
                <th class="p-4">Status</th>
                <th class="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              <tr *ngFor="let g of filteredGrievances()" class="hover:bg-slate-50 transition">
                <td class="p-4 font-mono font-bold text-slate-800">{{ g.trackingCode }}</td>
                <td class="p-4 max-w-xs">
                  <p class="font-bold text-slate-900 truncate">{{ g.title }}</p>
                  <p class="text-[11px] text-slate-400 truncate">{{ g.location }}</p>
                </td>
                <td class="p-4 text-slate-600">{{ g.category }}</td>
                <td class="p-4 text-slate-500">{{ g.createdAt | date:'dd/MM/yyyy' }}</td>
                <td class="p-4 space-x-1">
                  <app-status-badge [status]="g.status"></app-status-badge>
                </td>
                <td class="p-4 text-right">
                  <a [routerLink]="['/citizen/grievance', g.id]" class="px-3 py-1.5 bg-[#A0C8C3] text-slate-950 font-bold rounded-lg text-xs hover:bg-teal-300">
                    View →
                  </a>
                </td>
              </tr>

              <tr *ngIf="filteredGrievances().length === 0">
                <td colspan="6" class="p-8 text-center text-slate-400">No grievances match the search filter criteria.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `
})
export class GrievanceHistoryComponent {
  grievanceService = inject(GrievanceService);
  departmentService = inject(DepartmentService);

  searchKeyword = '';
  statusFilter = 'ALL';
  categoryFilter = 'ALL';

  filteredGrievances() {
    return this.grievanceService.roleGrievances().filter(g => {
      const matchesSearch = !this.searchKeyword || 
        g.trackingCode.toLowerCase().includes(this.searchKeyword.toLowerCase()) || 
        g.title.toLowerCase().includes(this.searchKeyword.toLowerCase());
      
      const matchesStatus = this.statusFilter === 'ALL' || g.status === this.statusFilter;
      const matchesCategory = this.categoryFilter === 'ALL' || g.category === this.categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }
}
