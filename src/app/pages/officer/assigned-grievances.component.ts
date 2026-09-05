import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GrievanceService } from '../../core/services/grievance.service';
import { StatusBadgeComponent } from '../../common/components/status-badge.component';
import { capitalizeFirstChar } from '../../core/directives/capitalize-first.directive';

@Component({
  selector: 'app-assigned-grievances',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusBadgeComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-900">Officer Workqueue</h1>
          <p class="text-xs text-slate-500">Manage and process complaints assigned to your department</p>
        </div>
      </div>

      <!-- Search & Status Filter Bar -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid sm:grid-cols-2 gap-4">
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
            placeholder="Search by Tracking Code, Title, Tourist Name..." 
            class="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#A0C8C3]"
          />
        </div>

        <select [(ngModel)]="statusFilter" class="px-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#A0C8C3]">
          <option value="ALL">All Statuses</option>
          <option value="submitted">Submitted / Action Required</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">Under Investigation / In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="reopened">Reopened / Escalated</option>
        </select>
      </div>

      <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-900 text-white uppercase text-[10px] font-bold">
            <tr>
              <th class="p-4">Tracking Code</th>
              <th class="p-4">Grievance Title</th>
              <th class="p-4">Tourist Name</th>
              <th class="p-4">Status</th>
              <th class="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <tr *ngFor="let g of filteredGrievances()" class="hover:bg-slate-50">
              <td class="p-4 font-mono font-bold text-slate-800">{{ g.trackingCode }}</td>
              <td class="p-4 font-bold text-slate-900">{{ g.title }}</td>
              <td class="p-4 text-slate-600">{{ g.touristName || 'Tourist' }}</td>
              <td class="p-4">
                <app-status-badge [status]="g.status"></app-status-badge>
              </td>
              <td class="p-4 text-right">
                <a [routerLink]="['/officer/process', g.id]" class="px-3 py-1.5 bg-amber-400 text-slate-950 rounded-lg font-bold text-xs hover:bg-amber-300 inline-flex items-center space-x-1">
                  <span>Process Case</span>
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
              </td>
            </tr>

            <tr *ngIf="filteredGrievances().length === 0">
              <td colspan="5" class="p-8 text-center text-slate-400 italic text-xs">
                No assigned cases match your search or filter criteria.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class AssignedGrievancesComponent implements OnInit {
  grievanceService = inject(GrievanceService);

  searchKeyword = '';
  statusFilter = 'ALL';

  async ngOnInit(): Promise<void> {
    await this.grievanceService.loadGrievancesFromBackend();
  }

  onSearchChange(val: string) {
    this.searchKeyword = capitalizeFirstChar(val);
  }

  filteredGrievances() {
    return this.grievanceService.roleGrievances().filter(g => {
      const keyword = this.searchKeyword.toLowerCase().trim();
      const matchesSearch = !keyword ||
        g.trackingCode.toLowerCase().includes(keyword) ||
        (g.grievanceCode && g.grievanceCode.toLowerCase().includes(keyword)) ||
        g.title.toLowerCase().includes(keyword) ||
        (g.touristName && g.touristName.toLowerCase().includes(keyword)) ||
        (g.location && g.location.toLowerCase().includes(keyword));

      const matchesStatus = this.statusFilter === 'ALL' || g.status === this.statusFilter;

      return matchesSearch && matchesStatus;
    });
  }
}
