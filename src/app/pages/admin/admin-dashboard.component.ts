import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { GrievanceService } from '../../core/services/grievance.service';
import { DepartmentService } from '../../core/services/department.service';
import { AuthService } from '../../core/services/auth.service';
import { ReportsService } from '../../core/services/reports.service';
import { Grievance } from '../../core/models/complaint.model';
import { ToastComponent } from '../../common/components/toast.component';
import { IconComponent } from '../../common/components/icon.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ToastComponent, IconComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <!-- Top Directorate Header Banner -->
      <div class="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div class="space-y-2">
          <div class="inline-flex items-center space-x-2 px-3 py-1 bg-rose-500/20 text-rose-300 rounded-full text-xs font-bold uppercase">
            <app-icon name="shield" size="w-3.5 h-3.5"></app-icon>
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
          <a routerLink="/admin/departments" class="bg-[#A0C8C3] text-slate-950 px-5 py-3 rounded-2xl font-extrabold text-xs hover:bg-teal-300 transition shadow-md inline-flex items-center space-x-1.5">
            <app-icon name="building" size="w-4 h-4"></app-icon>
            <span>Departments Directory</span>
          </a>
          <a routerLink="/admin/officers" class="bg-white text-slate-900 px-5 py-3 rounded-2xl font-extrabold text-xs hover:bg-slate-100 transition shadow-md inline-flex items-center space-x-1.5">
            <app-icon name="users" size="w-4 h-4"></app-icon>
            <span>Officers</span>
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
        
        <!-- Unassigned Department Boxes Queue (12 Cols) -->
        <div class="lg:col-span-12 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div class="flex justify-between items-center border-b pb-3">
            <div>
              <h3 class="font-extrabold text-slate-900 text-lg">Action Required: Unassigned Grievance Tickets</h3>
              <p class="text-xs text-slate-500">Overview of incoming grievances grouped by responsible department category requiring officer allocation.</p>
            </div>
            <a routerLink="/admin/departments" class="text-xs font-bold text-teal-700 hover:underline inline-flex items-center space-x-1">
              <span>Manage Departments & Officers</span>
              <app-icon name="arrow-right" size="w-3.5 h-3.5"></app-icon>
            </a>
          </div>

          <!-- Department Boxes Grid -->
          <div *ngIf="unassignedDepartmentBoxes().length > 0" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div *ngFor="let box of unassignedDepartmentBoxes()" class="bg-slate-50 rounded-2xl border border-slate-200 p-5 flex flex-col justify-between space-y-4 hover:shadow-md transition">
              <div class="space-y-3">
                <div class="flex justify-between items-start">
                  <div>
                    <h4 class="font-bold text-base text-slate-900">{{ box.departmentName }}</h4>
                    <span class="text-[10px] font-extrabold font-mono uppercase px-2 py-0.5 rounded" [class.bg-rose-100]="!box.departmentExists" [class.text-rose-800]="!box.departmentExists" [class.bg-amber-100]="box.departmentExists" [class.text-amber-800]="box.departmentExists">
                      {{ box.departmentExists ? (box.officerCount === 0 ? 'No Officers Assigned' : 'Officers Pending') : 'Department Missing' }}
                    </span>
                  </div>
                  <span class="px-2.5 py-1 bg-white border border-slate-300 text-slate-800 text-xs font-extrabold rounded-xl shadow-xs shrink-0">
                    {{ box.grievances.length }} Unassigned
                  </span>
                </div>

                <!-- Explanation Message -->
                <div class="p-3 rounded-xl text-xs border" [class.bg-rose-50]="!box.departmentExists" [class.border-rose-200]="!box.departmentExists" [class.text-rose-800]="!box.departmentExists" [class.bg-amber-50]="box.departmentExists" [class.border-amber-200]="box.departmentExists" [class.text-amber-800]="box.departmentExists">
                  <p class="font-bold leading-relaxed">{{ box.requirementMessage }}</p>
                </div>
              </div>

              <div class="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                <button (click)="openCheckGrievanceModal(box)" class="w-full py-2.5 bg-[#0F172A] text-white rounded-xl text-xs font-extrabold hover:bg-slate-800 transition flex items-center justify-center space-x-1.5 shadow-sm">
                  <app-icon name="eye" size="w-4 h-4"></app-icon>
                  <span>Check Grievance</span>
                </button>
              </div>
            </div>
          </div>

          <div *ngIf="unassignedDepartmentBoxes().length === 0" class="p-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-2xl">
            All grievances are currently assigned to active Officers.
          </div>
        </div>

        <!-- Check Grievance Modal -->
        <div *ngIf="selectedDepartmentBoxModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div class="bg-white rounded-3xl max-w-3xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto animate-modal-pop">
            <div class="flex justify-between items-center border-b pb-3">
              <div>
                <div class="flex items-center space-x-2">
                  <h3 class="font-bold text-lg text-slate-900">{{ selectedDepartmentBoxModal.departmentName }}</h3>
                  <span class="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold rounded-full">
                    {{ selectedDepartmentBoxModal.grievances.length }} Unassigned
                  </span>
                </div>
                <p class="text-xs text-slate-500">{{ selectedDepartmentBoxModal.requirementMessage }}</p>
              </div>
              <button (click)="selectedDepartmentBoxModal = null" class="text-slate-400 hover:text-slate-600 p-1">
                <app-icon name="x" size="w-5 h-5"></app-icon>
              </button>
            </div>

            <!-- Grievance Table -->
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-900 text-white uppercase text-[10px] font-bold">
                  <tr>
                    <th class="p-3">Grievance Code</th>
                    <th class="p-3">Complaint Title</th>
                    <th class="p-3">Tourist</th>
                    <th class="p-3">Category / Dept</th>
                    <th class="p-3">Filed Date</th>
                    <th class="p-3">Status</th>
                    <th class="p-3">Assignment State</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium">
                  <tr *ngFor="let g of selectedDepartmentBoxModal.grievances" class="hover:bg-slate-50">
                    <td class="p-3 font-mono font-bold text-slate-800">{{ g.grievanceCode || g.trackingCode }}</td>
                    <td class="p-3 font-bold text-slate-900 max-w-xs truncate">{{ g.title }}</td>
                    <td class="p-3 text-slate-600">
                      <p class="font-bold text-slate-900">{{ g.touristName || 'Tourist' }}</p>
                      <p class="text-[10px] text-slate-400 font-mono">{{ g.touristEmail || g.touristPhone || '' }}</p>
                    </td>
                    <td class="p-3 text-teal-800 font-bold">{{ g.departmentName || g.category }}</td>
                    <td class="p-3 text-slate-500">{{ g.createdAt | date:'dd/MM/yyyy' }}</td>
                    <td class="p-3">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase" [class.bg-amber-100]="g.status === 'submitted'" [class.text-amber-800]="g.status === 'submitted'" [class.bg-blue-100]="g.status === 'assigned'" [class.text-blue-800]="g.status === 'assigned'">
                        {{ g.status }}
                      </span>
                    </td>
                    <td class="p-3">
                      <span class="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold text-[10px] rounded uppercase">Unassigned</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="flex justify-end pt-3 border-t">
              <button (click)="selectedDepartmentBoxModal = null" class="px-5 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200">
                Close
              </button>
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

  selectedDepartmentBoxModal: {
    departmentName: string;
    requirementMessage: string;
    departmentExists: boolean;
    officerCount: number;
    grievances: Grievance[];
  } | null = null;

  openCheckGrievanceModal(box: any) {
    this.selectedDepartmentBoxModal = box;
  }

  unassignedDepartmentBoxes = computed(() => {
    const allGrievances = this.grievanceService.grievances();
    const allDepts = this.departmentService.departments();
    const registeredOfficers = this.authService.registeredOfficers();
    const activeOfficers = registeredOfficers.filter(o => !o.isRevoked);

    // Group unassigned grievances by department category/name
    const groups = new Map<string, {
      departmentName: string;
      departmentExists: boolean;
      officerCount: number;
      requirementMessage: string;
      grievances: Grievance[];
    }>();

    for (const g of allGrievances) {
      if (g.status === 'resolved' || g.status === 'closed' || g.status === 'cancelled') {
        continue;
      }

      const deptName = (g.departmentName || g.category || (g as any).originalDepartmentName || 'General').trim();
      const cleanDeptName = deptName.toLowerCase();

      const targetDept = allDepts.find(d => 
        (g.departmentId && d.id === g.departmentId) || 
        d.name.toLowerCase().trim() === cleanDeptName ||
        d.code.toLowerCase().trim() === cleanDeptName
      );

      // Find active officers for this department
      const deptActiveOfficers = targetDept ? activeOfficers.filter(o =>
        o.departmentId === targetDept.id ||
        (o.departmentName && o.departmentName.toLowerCase().trim() === targetDept.name.toLowerCase().trim())
      ) : [];

      const assignedOff = g.assignedOfficerId ? registeredOfficers.find(o => 
        o.id === g.assignedOfficerId || 
        o.email.toLowerCase().trim() === (g.assignedOfficerId || '').toLowerCase().trim() ||
        o.name.toLowerCase().trim() === (g.assignedOfficerName || '').toLowerCase().trim()
      ) : null;

      const isUnassigned = !g.assignedOfficerId || !assignedOff || assignedOff.isRevoked;

      if (isUnassigned) {
        if (!groups.has(cleanDeptName)) {
          const deptExists = !!targetDept && targetDept.isActive !== false;
          let requirementMsg = '';
          if (!targetDept) {
            requirementMsg = `${deptName} department doesn't exist.`;
          } else if (deptActiveOfficers.length === 0) {
            requirementMsg = `Add officers in ${targetDept.name} to assign these grievances.`;
          } else {
            requirementMsg = `Department has officers; automatic distribution pending.`;
          }

          groups.set(cleanDeptName, {
            departmentName: targetDept ? targetDept.name : deptName,
            departmentExists: !!targetDept,
            officerCount: deptActiveOfficers.length,
            requirementMessage: requirementMsg,
            grievances: []
          });
        }

        groups.get(cleanDeptName)!.grievances.push(g);
      }
    }

    return Array.from(groups.values());
  });
}
