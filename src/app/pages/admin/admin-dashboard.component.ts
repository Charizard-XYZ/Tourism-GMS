import { Component, computed, inject, signal, OnInit } from '@angular/core';
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

      <!-- Grievance Overview Section -->
      <div class="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
          <div>
            <h2 class="text-lg font-extrabold text-slate-900">Grievance Overview</h2>
            <p class="text-xs text-slate-500">Live system-wide operational status and grievance lifecycle distribution</p>
          </div>
          <span class="px-3 py-1 bg-teal-50 text-teal-800 text-xs font-bold rounded-xl self-start sm:self-auto">
            {{ grievanceService.grievances().length }} Total Records
          </span>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <span class="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Assigned / Active</span>
            <p class="text-3xl font-extrabold text-slate-900">{{ grievanceOverviewStats().active }}</p>
            <p class="text-[11px] text-slate-400">Cases assigned to officers</p>
          </div>

          <div class="p-5 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-1">
            <span class="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider">In Investigation</span>
            <p class="text-3xl font-extrabold text-amber-800">{{ grievanceOverviewStats().inProgress }}</p>
            <p class="text-[11px] text-amber-600">Active inquiry underway</p>
          </div>

          <div class="p-5 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-1">
            <span class="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">Resolved / Closed</span>
            <p class="text-3xl font-extrabold text-emerald-800">{{ grievanceOverviewStats().resolved }}</p>
            <p class="text-[11px] text-emerald-600">Successfully completed</p>
          </div>

          <div class="p-5 bg-rose-50/60 rounded-2xl border border-rose-200 space-y-1">
            <span class="text-[10px] font-extrabold text-rose-700 uppercase tracking-wider">Reopened / Escalated</span>
            <p class="text-3xl font-extrabold text-rose-800">{{ grievanceOverviewStats().reopened }}</p>
            <p class="text-[11px] text-rose-600">Follow-up action required</p>
          </div>
        </div>
      </div>

      <!-- Quick Action Desk Directives Grid -->
      <div class="grid lg:grid-cols-12 gap-8">
        
        <!-- Unassigned Master Queue (12 Cols) -->
        <div class="lg:col-span-12 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div class="flex justify-between items-center border-b pb-3">
            <div>
              <h3 class="font-extrabold text-slate-900 text-lg">Action Required: Unassigned Grievance Tickets</h3>
              <p class="text-xs text-slate-500">Departments with pending grievances awaiting Officer assignment.</p>
            </div>
            <a routerLink="/admin/grievances" class="text-xs font-bold text-teal-700 hover:underline flex items-center space-x-1">
              <span>Go to Master Desk</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>

          <div class="space-y-3">
            <div *ngFor="let group of unassignedDepartmentGroups()" class="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-amber-50/50 border border-amber-200 rounded-2xl gap-4">
              <div class="space-y-1">
                <div class="flex items-center space-x-2">
                  <span class="font-extrabold text-sm text-slate-900">{{ group.departmentName }}</span>
                  <span class="px-2.5 py-0.5 bg-amber-200 text-amber-900 text-xs font-extrabold rounded-full">
                    {{ group.count }} {{ group.count === 1 ? 'Unassigned Ticket' : 'Unassigned Tickets' }}
                  </span>
                </div>
                <p class="text-xs text-amber-800 font-medium">
                  {{ group.actionMessage }}
                </p>
              </div>

              <a routerLink="/admin/officers" class="px-4 py-2.5 bg-[#0F172A] text-white rounded-xl text-xs font-bold hover:bg-slate-800 shrink-0 text-center flex items-center space-x-1.5 self-start sm:self-auto shadow-sm">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>Register Officer</span>
              </a>
            </div>

            <div *ngIf="unassignedDepartmentGroups().length === 0" class="p-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-2xl">
              All grievances are currently assigned to active Officers.
            </div>
          </div>
        </div>

        <!-- Departmental Overview Breakdown Matrix -->
        <div class="lg:col-span-12 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 class="font-extrabold text-slate-900 text-lg border-b pb-3">Departmental Grievance Overview</h3>

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
export class AdminDashboardComponent implements OnInit {
  grievanceService = inject(GrievanceService);
  departmentService = inject(DepartmentService);
  reportsService = inject(ReportsService);
  authService = inject(AuthService);
  router = inject(Router);

  toastMessage = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.grievanceService.loadGrievancesFromBackend();
  }

  metrics = () => this.reportsService.getOverallMetrics();

  grievanceOverviewStats = computed(() => {
    const list = this.grievanceService.grievances();
    return {
      active: list.filter(g => g.status === 'assigned' || g.status === 'submitted').length,
      inProgress: list.filter(g => g.status === 'in_progress').length,
      resolved: list.filter(g => g.status === 'resolved' || g.status === 'closed').length,
      reopened: list.filter(g => g.status === 'reopened').length
    };
  });

  unassignedGrievances = computed(() => {
    const allGrievances = this.grievanceService.grievances();
    const registeredOfficers = this.authService.registeredOfficers();

    return allGrievances.filter(g => {
      // Resolved, closed, or cancelled are never unassigned
      if (g.status === 'resolved' || g.status === 'closed' || g.status === 'cancelled') {
        return false;
      }

      const offId = (g.assignedOfficerId || '').trim();
      if (!offId) {
        return true; // Genuinely unassigned
      }

      // Check the 4 conditions of valid assignment:
      const officer = registeredOfficers.find(o => o.id === offId);
      if (!officer) {
        return true; // Officer does not exist
      }
      if (officer.isRevoked || (officer as any).isActive === false) {
        return true; // Officer is not active/eligible
      }

      const gDeptId = g.departmentId || '';
      const gDeptName = (g.departmentName || g.category || '').trim().toLowerCase();
      const oDeptId = officer.departmentId || '';
      const oDeptName = (officer.departmentName || '').trim().toLowerCase();

      const matchesDept = (gDeptId && oDeptId && gDeptId === oDeptId) ||
        (gDeptName && oDeptName && oDeptName !== 'unassigned' && gDeptName === oDeptName);

      if (!matchesDept) {
        return true; // Officer does not belong to grievance department
      }

      // All 4 conditions met: validly assigned!
      return false;
    });
  });

  unassignedDepartmentGroups = computed(() => {
    const unassigned = this.unassignedGrievances();
    const registeredOfficers = this.authService.registeredOfficers();
    const departments = this.departmentService.departments();

    const groupMap = new Map<string, { departmentName: string; departmentId: string; count: number; actionMessage: string }>();

    for (const g of unassigned) {
      const deptName = g.departmentName || g.category || 'General';
      const deptId = g.departmentId || '';
      const key = (deptId || deptName).toLowerCase();

      if (!groupMap.has(key)) {
        const targetDept = departments.find(d => 
          (deptId && d.id === deptId) || 
          (d.name && d.name.toLowerCase().trim() === deptName.toLowerCase().trim())
        );
        const effectiveDeptId = targetDept ? targetDept.id : deptId;
        const effectiveDeptName = targetDept ? targetDept.name : deptName;

        const deptOfficers = registeredOfficers.filter(o => 
          (effectiveDeptId && o.departmentId === effectiveDeptId) ||
          (o.departmentName && o.departmentName.toLowerCase().trim() === effectiveDeptName.toLowerCase().trim())
        );

        let actionMessage = 'Action Required: Register an Officer for this department.';
        if (deptOfficers.length > 0) {
          const hasEligible = deptOfficers.some(o => !o.isRevoked && (o as any).isActive !== false);
          if (!hasEligible) {
            actionMessage = 'Action Required: Activate or register an eligible Officer for this department.';
          }
        }

        groupMap.set(key, {
          departmentName: effectiveDeptName,
          departmentId: effectiveDeptId,
          count: 0,
          actionMessage
        });
      }

      groupMap.get(key)!.count++;
    }

    return Array.from(groupMap.values()).filter(group => group.count > 0);
  });
}
