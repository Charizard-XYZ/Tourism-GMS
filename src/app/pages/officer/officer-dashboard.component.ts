import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GrievanceService } from '../../core/services/grievance.service';
import { AuthService } from '../../core/services/auth.service';
import { StatusBadgeComponent } from '../../common/components/status-badge.component';

@Component({
  selector: 'app-officer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <!-- Welcome Header -->
      <div class="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div class="space-y-2">
          <div class="inline-flex items-center space-x-2 px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-bold uppercase">
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
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </a>
      </div>

      <!-- Grievance Overview Section -->
      <div class="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
          <div>
            <h2 class="text-lg font-extrabold text-slate-900">Grievance Overview</h2>
            <p class="text-xs text-slate-500">Live operational status and queue distribution for your assigned cases</p>
          </div>
          <span class="px-3 py-1 bg-teal-50 text-teal-800 text-xs font-bold rounded-xl self-start sm:self-auto">
            {{ assignedCount() }} Total Assigned
          </span>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <span class="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Total Assigned</span>
            <p class="text-2xl sm:text-3xl font-extrabold text-slate-900">{{ assignedCount() }}</p>
            <p class="text-[11px] text-slate-400">Cases allocated to you</p>
          </div>

          <div class="p-5 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-1">
            <span class="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider">Pending / In Investigation</span>
            <p class="text-2xl sm:text-3xl font-extrabold text-amber-800">{{ pendingCount() }}</p>
            <p class="text-[11px] text-amber-600">Active inquiry underway</p>
          </div>

          <div class="p-5 bg-rose-50/60 rounded-2xl border border-rose-200 space-y-1">
            <span class="text-[10px] font-extrabold text-rose-700 uppercase tracking-wider">Reopened</span>
            <p class="text-2xl sm:text-3xl font-extrabold text-rose-800">{{ reopenedCount() }}</p>
            <p class="text-[11px] text-rose-600">Requires re-investigation</p>
          </div>

          <div class="p-5 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-1">
            <span class="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">Successfully Resolved</span>
            <p class="text-2xl sm:text-3xl font-extrabold text-emerald-800">{{ resolvedCount() }}</p>
            <p class="text-[11px] text-emerald-600">Successfully closed</p>
          </div>
        </div>
      </div>

      <!-- Workqueue Grievance List -->
      <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Your Assigned Workqueue</h2>
            <p class="text-xs text-slate-500">Select a grievance to update status, add internal notes, or submit resolution</p>
          </div>
        </div>

        <div class="divide-y divide-slate-100">
          <div *ngFor="let g of grievanceService.roleGrievances()" class="p-5 hover:bg-slate-50 transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div class="space-y-1.5 max-w-2xl">
              <div class="flex items-center space-x-2">
                <span class="font-mono text-xs font-bold text-slate-500">{{ g.trackingCode }}</span>
                <app-status-badge [status]="g.status"></app-status-badge>
              </div>
              <h3 class="font-bold text-base text-slate-900">
                <a [routerLink]="['/officer/process', g.id]">{{ g.title }}</a>
              </h3>
              <p class="text-xs text-slate-500 line-clamp-1">Tourist: {{ g.touristName || 'Tourist' }} ({{ g.touristPhone || g.touristEmail || 'No contact' }})</p>
              <div class="flex items-center space-x-4 text-[11px] text-slate-400 pt-1">
                <span>Location: {{ g.location }}</span>
                <span>Filed: {{ g.createdAt | date:'dd/MM/yyyy' }}</span>
              </div>
            </div>

            <div class="shrink-0">
              <a [routerLink]="['/officer/process', g.id]" class="px-4 py-2 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold hover:bg-amber-400 shadow-sm flex items-center space-x-1">
                <span>Process Case</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
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
    return this.grievanceService.roleGrievances().length;
  }

  pendingCount(): number {
    return this.grievanceService.roleGrievances().filter(g => g.status === 'assigned' || g.status === 'in_progress' || g.status === 'submitted').length;
  }

  reopenedCount(): number {
    return this.grievanceService.roleGrievances().filter(g => g.status === 'reopened').length;
  }

  resolvedCount(): number {
    return this.grievanceService.roleGrievances().filter(g => g.status === 'resolved' || g.status === 'closed').length;
  }

  resolutionRate(): number {
    const total = this.assignedCount();
    return total > 0 ? Math.round((this.resolvedCount() / total) * 100) : 100;
  }
}
