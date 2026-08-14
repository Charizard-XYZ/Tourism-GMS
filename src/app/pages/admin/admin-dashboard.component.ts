import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GrievanceService } from '../../core/services/grievance.service';
import { DepartmentService } from '../../core/services/department.service';
import { ReportsService } from '../../core/services/reports.service';
import { AuditLogService } from '../../core/services/audit-log.service';
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <!-- Top Directorate Header Banner -->
      <div class="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div class="space-y-2">
          <div class="inline-flex items-center space-x-2 px-3 py-1 bg-rose-500/20 text-rose-300 rounded-full text-xs font-bold uppercase">
            <span>Directorate Executive Dashboard</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Directorate Admin Control Center
          </h1>
          <p class="text-sm text-slate-300">
            System-wide oversight for Tourism & Civil Aviation grievance progress monitoring and department management.
          </p>
        </div>

        <div class="flex flex-wrap gap-2 shrink-0">
          <a routerLink="/admin/departments" class="bg-[#A0C8C3] text-slate-950 px-5 py-3 rounded-2xl font-extrabold text-xs hover:bg-teal-300 transition shadow-md">
            🏢 Manage Departments
          </a>
          <a routerLink="/admin/grievances" class="bg-rose-600 text-white px-5 py-3 rounded-2xl font-extrabold text-xs hover:bg-rose-700 transition shadow-md">
            📌 Master Grievance Desk
          </a>
        </div>
      </div>

      <!-- System Master KPI Summary Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <p class="text-xs font-bold text-slate-500 uppercase">Total Complaints</p>
          <p class="text-3xl font-extrabold text-slate-900">{{ metrics().totalComplaints }}</p>
          <p class="text-[11px] text-slate-400">All registered system tickets</p>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <p class="text-xs font-bold text-rose-600 uppercase">Escalated Tickets</p>
          <p class="text-3xl font-extrabold text-rose-600">{{ metrics().escalated }}</p>
          <p class="text-[11px] text-slate-400">SLA breached or reopened</p>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <p class="text-xs font-bold text-emerald-600 uppercase">Overall Resolution Rate</p>
          <p class="text-3xl font-extrabold text-emerald-600">{{ metrics().resolutionRate }}%</p>
          <p class="text-[11px] text-slate-400">Target 95% threshold</p>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <p class="text-xs font-bold text-purple-600 uppercase">Active Departments</p>
          <p class="text-3xl font-extrabold text-purple-600">{{ metrics().totalDepartments }}</p>
          <p class="text-[11px] text-slate-400">With 93 active Nodal Officers</p>
        </div>

      </div>

      <!-- Department Workload Grid & Activity Logs -->
      <div class="grid lg:grid-cols-12 gap-8">
        
        <!-- Department Workload Breakdown (8 Cols) -->
        <div class="lg:col-span-12 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div class="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h2 class="text-lg font-bold text-slate-900">Departmental Workload Matrix</h2>
              <p class="text-xs text-slate-500">Live operational metric for active cells</p>
            </div>
            <a routerLink="/admin/departments" class="text-xs font-bold text-teal-700 hover:underline">Manage All →</a>
          </div>

          <div class="space-y-4">
            <div *ngFor="let d of reportsService.getDepartmentBreakdown()" class="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
              <div class="flex justify-between items-center">
                <div class="flex items-center space-x-2">
                  <span class="font-mono text-xs font-bold text-slate-500">{{ d.code }}</span>
                  <h4 class="font-bold text-sm text-slate-900">{{ d.name }}</h4>
                </div>
                <span class="text-xs font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">{{ d.slaCompliance }}% Success Rate</span>
              </div>

              <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div class="bg-[#A0C8C3] h-2 rounded-full" [style.width.%]="d.slaCompliance"></div>
              </div>

              <div class="flex justify-between text-xs text-slate-500 pt-1">
                <span>Total Grievances: <strong>{{ d.total }}</strong></span>
                <span>Resolved: <strong>{{ d.resolved }}</strong></span>
                <span>Pending Action: <strong class="text-amber-600">{{ d.pending }}</strong></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Audit Trail Feed (4 Cols) -->
        <div class="lg:col-span-12 bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-xl p-6 space-y-4">
          <div class="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 class="font-bold text-sm text-[#A0C8C3] uppercase tracking-wider">Live System Audit Feed</h3>
            <a routerLink="/admin/audit-logs" class="text-[11px] text-slate-400 hover:underline">Full Log →</a>
          </div>

          <div class="space-y-3 max-h-96 overflow-y-auto">
            <div *ngFor="let log of auditLogService.logs().slice(0, 5)" class="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 space-y-1">
              <div class="flex justify-between items-center text-[10px]">
                <span class="font-bold text-emerald-400">{{ log.action }}</span>
                <span class="text-slate-400">{{ log.timestamp | date:'dd/MM/yyyy, hh:mm a' }}</span>
              </div>
              <p class="text-xs text-slate-200 leading-snug">{{ log.details }}</p>
              <p class="text-[10px] text-slate-400">By: {{ log.userName }} ({{ log.userRole | uppercase }})</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  `
})
export class AdminDashboardComponent {
  grievanceService = inject(GrievanceService);
  departmentService = inject(DepartmentService);
  reportsService = inject(ReportsService);
  auditLogService = inject(AuditLogService);

  metrics = () => this.reportsService.getOverallMetrics();
}
