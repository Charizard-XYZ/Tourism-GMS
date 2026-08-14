import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditLogService } from '../../core/services/audit-log.service';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      <div class="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl">
        <h1 class="text-2xl font-extrabold">System Activity Audit Logs</h1>
        <p class="text-xs text-[#A0C8C3]">Immutable audit trail recording user actions, role changes, and grievance updates</p>
      </div>

      <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-900 text-white uppercase text-[10px] font-bold">
            <tr>
              <th class="p-4">Timestamp</th>
              <th class="p-4">User</th>
              <th class="p-4">Role</th>
              <th class="p-4">Action</th>
              <th class="p-4">Target Collection</th>
              <th class="p-4">Details</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <tr *ngFor="let log of auditLogService.logs()" class="hover:bg-slate-50">
              <td class="p-4 font-mono text-slate-500">{{ log.timestamp | date:'dd/MM/yyyy, hh:mm a' }}</td>
              <td class="p-4 font-bold text-slate-900">{{ log.userName }}</td>
              <td class="p-4">
                <span [ngClass]="{
                  'bg-emerald-100 text-emerald-800': log.userRole === 'citizen',
                  'bg-amber-100 text-amber-800': log.userRole === 'officer',
                  'bg-rose-100 text-rose-800': log.userRole === 'admin'
                }" class="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase">
                  {{ log.userRole }}
                </span>
              </td>
              <td class="p-4 font-bold text-slate-800">{{ log.action }}</td>
              <td class="p-4 text-slate-600 font-mono">{{ log.targetCollection }}</td>
              <td class="p-4 text-slate-700 max-w-xs truncate">{{ log.details }}</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  `
})
export class AuditLogsComponent {
  auditLogService = inject(AuditLogService);
}
