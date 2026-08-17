import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportsService } from '../../core/services/reports.service';

@Component({
  selector: 'app-reports-analytics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <!-- Top Title Header -->
      <div class="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div class="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold uppercase mb-1">
            <span>Directorate Admin Panel</span>
          </div>
          <h1 class="text-2xl font-extrabold text-slate-900">Departmental Grievance Report</h1>
          <p class="text-xs text-slate-500">Live operational compliance performance matrix across all registered Directorate Departments</p>
        </div>
      </div>

      <!-- Departmental Performance Report Matrix Table -->
      <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th class="p-4">Dept Code</th>
                <th class="p-4">Department Name</th>
                <th class="p-4">Short Detail / Scope</th>
                <th class="p-4 text-center">Total Received</th>
                <th class="p-4 text-center">Resolved Cases</th>
                <th class="p-4 text-center">Pending Cases</th>
                <th class="p-4 text-right">SLA Score</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              <tr *ngFor="let d of reportsService.getDepartmentBreakdown()" class="hover:bg-slate-50 transition">
                <td class="p-4 font-mono font-bold text-slate-800">{{ d.code }}</td>
                <td class="p-4 font-bold text-slate-900">{{ d.name }}</td>
                <td class="p-4 text-slate-500 max-w-xs truncate">{{ d.description || 'General Tourism Scope' }}</td>
                <td class="p-4 text-center font-bold text-slate-900">{{ d.total }}</td>
                <td class="p-4 text-center font-bold text-emerald-700">{{ d.resolved }}</td>
                <td class="p-4 text-center font-bold text-rose-700">{{ d.pending }}</td>
                <td class="p-4 text-right">
                  <span class="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-full">
                    {{ d.slaCompliance }}%
                  </span>
                </td>
              </tr>

              <tr *ngIf="reportsService.getDepartmentBreakdown().length === 0">
                <td colspan="7" class="p-8 text-center text-slate-400 italic">No departmental report data available.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `
})
export class ReportsAnalyticsComponent {
  reportsService = inject(ReportsService);
}
