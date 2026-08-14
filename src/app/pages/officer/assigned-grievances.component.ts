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
            <tr *ngFor="let g of grievanceService.roleGrievances()" class="hover:bg-slate-50">
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
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class AssignedGrievancesComponent {
  grievanceService = inject(GrievanceService);
}
