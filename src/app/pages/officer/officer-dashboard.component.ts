import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GrievanceService } from '../../core/services/grievance.service';
import { AuthService } from '../../core/services/auth.service';
import { StatusBadgeComponent } from '../../common/components/status-badge.component';
import { IconComponent } from '../../common/components/icon.component';

@Component({
  selector: 'app-officer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent, IconComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <!-- Welcome Header -->
      <div class="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div class="space-y-2">
          <div class="inline-flex items-center space-x-2 px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-bold uppercase">
            <app-icon name="shield" size="w-3.5 h-3.5"></app-icon>
            <span>Officer Portal</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Officer Desk: {{ authService.currentUser()?.displayName }}
          </h1>
          <p class="text-sm text-slate-300">
            Department: <strong class="text-white">{{ authService.currentUser()?.departmentName || 'Unassigned' }}</strong>
          </p>
        </div>

        <a routerLink="/officer/grievances" class="bg-amber-400 text-slate-950 px-6 py-3.5 rounded-2xl font-extrabold text-sm hover:bg-amber-300 transition shadow-lg shrink-0 flex items-center space-x-1.5">
          <span>Review Workqueue</span>
          <app-icon name="arrow-right" size="w-4 h-4"></app-icon>
        </a>
      </div>

      <!-- Officer Metrics Grid -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div class="flex items-center justify-between">
            <p class="text-xs font-bold text-slate-500 uppercase">Active / Assigned</p>
            <app-icon name="file-text" size="w-4 h-4" class="text-slate-400"></app-icon>
          </div>
          <p class="text-3xl font-extrabold text-slate-900">{{ assignedCount() }}</p>
          <p class="text-[11px] text-slate-400">Newly assigned cases</p>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div class="flex items-center justify-between">
            <p class="text-xs font-bold text-amber-600 uppercase">Processing (In Inquiry)</p>
            <app-icon name="alert-circle" size="w-4 h-4" class="text-amber-500"></app-icon>
          </div>
          <p class="text-3xl font-extrabold text-amber-600">{{ processingCount() }}</p>
          <p class="text-[11px] text-slate-400">Under active investigation</p>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div class="flex items-center justify-between">
            <p class="text-xs font-bold text-emerald-600 uppercase">Resolved</p>
            <app-icon name="check-circle" size="w-4 h-4" class="text-emerald-500"></app-icon>
          </div>
          <p class="text-3xl font-extrabold text-emerald-600">{{ resolvedCount() }}</p>
          <p class="text-[11px] text-slate-400">Resolved, awaiting feedback</p>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div class="flex items-center justify-between">
            <p class="text-xs font-bold text-sky-600 uppercase">Successfully Closed</p>
            <app-icon name="bar-chart" size="w-4 h-4" class="text-sky-500"></app-icon>
          </div>
          <p class="text-3xl font-extrabold text-sky-600">{{ closedCount() }}</p>
          <p class="text-[11px] text-slate-400">Closed after tourist feedback</p>
        </div>
      </div>

      <!-- Workqueue Grievance List -->
      <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Your Assigned Workqueue</h2>
            <p class="text-xs text-slate-500">Live active cases requiring departmental action (resolved and closed cases are preserved in History)</p>
          </div>
          <a routerLink="/officer/history" class="text-xs font-bold text-teal-700 hover:text-teal-900 inline-flex items-center space-x-1">
            <span>View Closed History</span>
            <app-icon name="arrow-right" size="w-3.5 h-3.5"></app-icon>
          </a>
        </div>

        <div class="divide-y divide-slate-100 font-medium">
          <div *ngFor="let g of grievanceService.roleGrievances()" class="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition">
            <div class="space-y-1 max-w-xl">
              <div class="flex items-center space-x-3">
                <span class="font-mono font-bold text-xs text-slate-500">{{ g.trackingCode }}</span>
                <app-status-badge [status]="g.status"></app-status-badge>
                <span *ngIf="g.isEscalated" class="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold uppercase rounded">Escalated</span>
              </div>
              <h3 class="font-bold text-slate-900">{{ g.title }}</h3>
              <p class="text-xs text-slate-500 line-clamp-1">{{ g.description }}</p>
              <div class="flex items-center space-x-3 text-[11px] text-slate-400 pt-1">
                <span>{{ g.location }}</span>
                <span>•</span>
                <span>Filed {{ g.createdAt | date:'dd/MM/yyyy' }}</span>
                <span>•</span>
                <span>Tourist: <strong class="text-slate-700">{{ g.touristName || 'Tourist' }}</strong></span>
              </div>
            </div>

            <div class="flex items-center space-x-2 shrink-0">
              <a [routerLink]="['/officer/process', g.id]" class="px-4 py-2 bg-amber-400 text-slate-950 rounded-xl font-bold text-xs hover:bg-amber-300 transition shadow-sm flex items-center space-x-1.5">
                <span>Update Status</span>
                <app-icon name="arrow-right" size="w-3.5 h-3.5"></app-icon>
              </a>
            </div>
          </div>

          <div *ngIf="grievanceService.roleGrievances().length === 0" class="p-12 text-center text-slate-400 text-xs">
            No grievances in your department workqueue currently.
          </div>
        </div>
      </div>

    </div>
  `
})
export class OfficerDashboardComponent implements OnInit {
  grievanceService = inject(GrievanceService);
  authService = inject(AuthService);

  async ngOnInit(): Promise<void> {
    await this.grievanceService.loadGrievancesFromBackend();
  }

  assignedCount(): number {
    return this.grievanceService.allOfficerGrievances().filter(g => g.status === 'assigned' || g.status === 'submitted').length;
  }

  processingCount(): number {
    return this.grievanceService.allOfficerGrievances().filter(g => g.status === 'in_progress' || g.status === 'reopened').length;
  }

  resolvedCount(): number {
    return this.grievanceService.allOfficerGrievances().filter(g => g.status === 'resolved').length;
  }
  closedCount(): number {
    return this.grievanceService.allOfficerGrievances().filter(g => g.status === 'closed').length;
  }
}
