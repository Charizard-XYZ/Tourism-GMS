import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GrievanceService } from '../../core/services/grievance.service';
import { DepartmentService } from '../../core/services/department.service';
import { ReportsService } from '../../core/services/reports.service';

@Component({
  selector: 'app-reports-analytics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <!-- Executive Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div class="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-bold uppercase mb-1">
            <span>Directorate Intelligence Unit</span>
          </div>
          <h1 class="text-2xl font-extrabold text-slate-900">Reports & Analytics Center</h1>
          <p class="text-xs text-slate-500">Executive performance metrics, department short details, compliance reports, and CSV export</p>
        </div>

        <div class="flex space-x-2">
          <button (click)="exportData()" class="px-4 py-2.5 bg-emerald-700 text-white rounded-xl text-xs font-extrabold hover:bg-emerald-800 shadow-sm flex items-center space-x-1.5">
            <span>Export CSV Data</span>
          </button>
          <button (click)="reportsService.printReport('Grievance-SLA-Report')" class="px-4 py-2.5 bg-[#0F172A] text-white rounded-xl text-xs font-extrabold hover:bg-slate-800 shadow-sm flex items-center space-x-1.5">
            <span>Print Executive Summary</span>
          </button>
        </div>
      </div>

      <!-- Department Performance Matrix Table -->
      <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <h3 class="font-extrabold text-slate-900 text-base border-b pb-3">Departmental SLA Compliance & Details Matrix</h3>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-900 text-white uppercase text-[10px] font-bold">
              <tr>
                <th class="p-4">Dept Code</th>
                <th class="p-4">Department Name</th>
                <th class="p-4">Short Detail / Scope</th>
                <th class="p-4">Total Received</th>
                <th class="p-4">Resolved Count</th>
                <th class="p-4">Pending Action</th>
                <th class="p-4">Compliance Score</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              <tr *ngFor="let d of reportsService.getDepartmentBreakdown()" class="hover:bg-slate-50">
                <td class="p-4 font-mono font-bold text-slate-800">{{ d.code }}</td>
                <td class="p-4 font-bold text-slate-900">{{ d.name }}</td>
                <td class="p-4 text-slate-600 max-w-xs text-[11px] leading-relaxed">{{ d.description }}</td>
                <td class="p-4 text-slate-700 font-bold">{{ d.total }}</td>
                <td class="p-4 text-emerald-600 font-bold">{{ d.resolved }}</td>
                <td class="p-4 text-amber-600 font-bold">{{ d.pending }}</td>
                <td class="p-4">
                  <div class="flex items-center space-x-2">
                    <div class="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div class="bg-emerald-500 h-2 rounded-full" [style.width.%]="d.slaCompliance"></div>
                    </div>
                    <span class="font-extrabold text-slate-900 text-xs">{{ d.slaCompliance }}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `
})
export class ReportsAnalyticsComponent {
  grievanceService = inject(GrievanceService);
  departmentService = inject(DepartmentService);
  reportsService = inject(ReportsService);

  exportData() {
    const departmentBreakdown = this.reportsService.getDepartmentBreakdown().map(d => ({
      DeptCode: d.code,
      DepartmentName: d.name,
      ShortDetail: d.description,
      TotalReceived: d.total,
      ResolvedCount: d.resolved,
      PendingCount: d.pending,
      ComplianceScore: `${d.slaCompliance}%`
    }));
    this.reportsService.exportToCsv('Departmental_Grievance_Report_2026', departmentBreakdown);
  }
}
