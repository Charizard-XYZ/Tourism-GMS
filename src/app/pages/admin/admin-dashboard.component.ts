import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { GrievanceService } from '../../core/services/grievance.service';
import { DepartmentService } from '../../core/services/department.service';
import { AuthService } from '../../core/services/auth.service';
import { ReportsService } from '../../core/services/reports.service';
import { Grievance } from '../../core/models/complaint.model';
import { ToastComponent } from '../../common/components/toast.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ToastComponent],
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
            Departments Directory
          </a>
          <a routerLink="/admin/officers" class="bg-white text-slate-900 px-5 py-3 rounded-2xl font-extrabold text-xs hover:bg-slate-100 transition shadow-md">
            Officers
          </a>
        </div>
      </div>

      <!-- High-Level KPI Summary Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Complaints</span>
          <p class="text-3xl font-extrabold text-slate-900">{{ metrics().totalComplaints }}</p>
        </div>

        <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <span class="text-xs font-bold text-amber-800 uppercase tracking-wider">Unassigned / Pending</span>
          <p class="text-3xl font-extrabold text-amber-900">{{ metrics().pending }}</p>
        </div>

        <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <span class="text-xs font-bold text-blue-600 uppercase tracking-wider">Under Investigation</span>
          <p class="text-3xl font-extrabold text-blue-700">{{ metrics().inProgress }}</p>
        </div>

        <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <span class="text-xs font-bold text-emerald-800 uppercase tracking-wider">Resolved Cases</span>
          <p class="text-3xl font-extrabold text-emerald-900">{{ metrics().resolved }}</p>
        </div>
      </div>

      <!-- Quick Action Desk Directives Grid -->
      <div class="grid lg:grid-cols-12 gap-8">
        
        <!-- Unassigned Master Queue (12 Cols) -->
        <div class="lg:col-span-12 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div class="flex justify-between items-center border-b pb-3">
            <div>
              <h3 class="font-extrabold text-slate-900 text-lg">Action Required: Unassigned Grievance Tickets</h3>
              <p class="text-xs text-slate-500">Assign these incoming grievances to designated Officers immediately.</p>
            </div>
            <a routerLink="/admin/grievances" class="text-xs font-bold text-teal-700 hover:underline">Go to Master Desk →</a>
          </div>

          <div class="space-y-3">
            <div *ngFor="let g of unassignedGrievances()" class="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-amber-50/50 border border-amber-200 rounded-2xl gap-4">
              <div>
                <div class="flex items-center space-x-2">
                  <span class="font-mono text-xs font-bold text-slate-700">{{ g.trackingCode }}</span>
                  <span class="px-2 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-extrabold uppercase rounded">Unassigned</span>
                </div>
                <p class="text-xs text-slate-600">Department: <strong class="text-teal-800 font-bold">{{ g.departmentName || g.category }}</strong> | Tourist: {{ g.citizenName }} | Location: {{ g.location }}</p>
                
                <!-- Tourist Attached Files for Admin -->
                <div *ngIf="g.attachments && g.attachments.length > 0" class="pt-2 flex flex-wrap gap-2">
                  <a *ngFor="let att of g.attachments" [href]="att.url" target="_blank" class="px-2.5 py-1 bg-white border border-amber-300 text-amber-950 rounded-lg text-[11px] font-bold hover:bg-amber-100 transition">
                    <span>{{ att.name }}</span>
                  </a>
                </div>
              </div>

              <button (click)="assignOfficerClick(g)" class="px-4 py-2 bg-[#0F172A] text-white rounded-xl text-xs font-bold hover:bg-slate-800 shrink-0 text-center">
                Assign
              </button>
            </div>

            <div *ngIf="unassignedGrievances().length === 0" class="p-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-2xl">
              All grievances are currently assigned to active Officers.
            </div>
          </div>
        </div>

        <!-- Departmental Overview Breakdown Matrix -->
        <div class="lg:col-span-12 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 class="font-extrabold text-slate-900 text-lg border-b pb-3">Departmental Grievance Resolution Overview</h3>

          <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div *ngFor="let d of reportsService.getDepartmentBreakdown()" class="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
              <span class="text-[10px] font-extrabold font-mono text-slate-700 bg-slate-200 px-2 py-0.5 rounded">{{ d.code }}</span>
              <h4 class="font-bold text-xs text-slate-900 line-clamp-1">{{ d.name }}</h4>
              
              <div class="text-[11px] space-y-1 text-slate-600 border-t pt-2">
                <div class="flex justify-between"><span>Received:</span> <strong class="text-slate-900">{{ d.total }}</strong></div>
                <div class="flex justify-between"><span>Resolved:</span> <strong class="text-emerald-700">{{ d.resolved }}</strong></div>
                <div class="flex justify-between"><span>Pending:</span> <strong class="text-rose-700">{{ d.pending }}</strong></div>
              </div>

              <div class="pt-1">
                <div class="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div class="bg-teal-700 h-1.5 rounded-full" [style.width.%]="d.slaCompliance"></div>
                </div>
                <p class="text-[9px] text-right text-slate-700 font-bold mt-1">{{ d.slaCompliance }}% SLA Resolved</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      <app-toast [message]="toastMessage()" (dismiss)="toastMessage.set(null)"></app-toast>

    </div>
  `
})
export class AdminDashboardComponent {
  grievanceService = inject(GrievanceService);
  departmentService = inject(DepartmentService);
  reportsService = inject(ReportsService);
  authService = inject(AuthService);
  router = inject(Router);

  toastMessage = signal<string | null>(null);

  metrics = () => this.reportsService.getOverallMetrics();

  unassignedGrievances = computed(() => {
    const allGrievances = this.grievanceService.grievances();
    const allDepts = this.departmentService.departments();
    const registeredOfficers = this.authService.registeredOfficers();
    const activeOfficers = registeredOfficers.filter(o => !o.isRevoked);

    return allGrievances.filter(g => {
      if (g.status === 'resolved' || g.status === 'closed') {
        return false;
      }

      const deptName = g.departmentName || g.category;
      const targetDept = allDepts.find(d => 
        d.id === g.departmentId || 
        (deptName && d.name.toLowerCase().trim() === deptName.toLowerCase().trim()) ||
        (deptName && d.code.toLowerCase().trim() === deptName.toLowerCase().trim())
      );

      // Condition 1: Department does not exist (deleted by admin)
      if (!targetDept) {
        return true;
      }

      // Condition 2: Department exists but is inactive
      if (!targetDept.isActive) {
        return true;
      }

      // Find active officers assigned to this department
      const deptActiveOfficers = activeOfficers.filter(o =>
        o.departmentId === targetDept.id ||
        (o.departmentName && o.departmentName.toLowerCase().trim() === targetDept.name.toLowerCase().trim())
      );

      // Condition 3: No officer is assigned in that department
      if (deptActiveOfficers.length === 0) {
        return true;
      }

      // Condition 4: No officer assigned to this grievance or assigned officer was revoked
      if (!g.assignedOfficerId) {
        return true;
      }

      const assignedOff = registeredOfficers.find(o => 
        o.id === g.assignedOfficerId || 
        o.email.toLowerCase().trim() === (g.assignedOfficerId || '').toLowerCase().trim() ||
        o.name.toLowerCase().trim() === (g.assignedOfficerName || '').toLowerCase().trim()
      );

      if (!assignedOff || assignedOff.isRevoked) {
        return true;
      }

      return false;
    });
  });

  assignOfficerClick(g: Grievance) {
    const deptName = g.departmentName || g.category;
    const depts = this.departmentService.departments();
    const registeredOfficers = this.authService.registeredOfficers();
    const activeOfficers = registeredOfficers.filter(o => !o.isRevoked);

    const targetDept = depts.find(d => 
      d.id === g.departmentId || 
      (deptName && d.name.toLowerCase().trim() === deptName.toLowerCase().trim()) ||
      (deptName && d.code.toLowerCase().trim() === deptName.toLowerCase().trim())
    );

    if (!targetDept) {
      this.toastMessage.set(`Department does not exist. Please create ${deptName}`);
      return;
    }

    if (!targetDept.isActive) {
      this.toastMessage.set(`please activate department`);
      this.router.navigate(['/admin/departments'], { queryParams: { deptId: targetDept.id } });
      return;
    }

    const deptActiveOfficers = activeOfficers.filter(o =>
      o.departmentId === targetDept.id ||
      (o.departmentName && o.departmentName.toLowerCase().trim() === targetDept.name.toLowerCase().trim())
    );

    if (deptActiveOfficers.length === 0) {
      this.toastMessage.set(`please assign officer`);
      this.router.navigate(['/admin/departments'], { queryParams: { deptId: targetDept.id } });
      return;
    }

    this.router.navigate(['/admin/departments'], { queryParams: { deptId: targetDept.id } });
  }
}
