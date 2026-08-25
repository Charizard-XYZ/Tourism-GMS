import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GrievanceService } from '../../core/services/grievance.service';
import { StatusBadgeComponent } from '../../common/components/status-badge.component';

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
        <input 
          type="text" 
          [(ngModel)]="searchKeyword" 
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          data-lpignore="true"
          placeholder="Search by Tracking Code, Title, Tourist Name..." 
          class="px-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#A0C8C3]"
        />

        <select [(ngModel)]="statusFilter" class="px-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#A0C8C3]">
          <option value="ALL">All Statuses</option>
          <option value="assigned">Assigned to Officer</option>
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
              <td class="p-4 text-slate-600">{{ g.citizenName }}</td>
              <td class="p-4">
                <app-status-badge [status]="g.status"></app-status-badge>
              </td>
              <td class="p-4 text-right">
                <a [routerLink]="['/officer/process', g.id]" class="px-3 py-1.5 bg-amber-400 text-slate-950 rounded-lg font-bold text-xs hover:bg-amber-300">
                  Process Case →
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
export class AssignedGrievancesComponent {
  grievanceService = inject(GrievanceService);

  searchKeyword = '';
  statusFilter = 'ALL';

  filteredGrievances() {
    return this.grievanceService.roleGrievances().filter(g => {
      const keyword = this.searchKeyword.toLowerCase().trim();
      const matchesSearch = !keyword ||
        g.trackingCode.toLowerCase().includes(keyword) ||
        g.title.toLowerCase().includes(keyword) ||
        g.citizenName.toLowerCase().includes(keyword) ||
        (g.location && g.location.toLowerCase().includes(keyword));

      const matchesStatus = this.statusFilter === 'ALL' || g.status === this.statusFilter;

      return matchesSearch && matchesStatus;
    });
  }
}
