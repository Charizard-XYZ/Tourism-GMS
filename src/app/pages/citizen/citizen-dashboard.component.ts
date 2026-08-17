import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GrievanceService } from '../../core/services/grievance.service';
import { AuthService } from '../../core/services/auth.service';
import { StatusBadgeComponent } from '../../common/components/status-badge.component';

@Component({
  selector: 'app-citizen-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <!-- Welcome Banner -->
      <div class="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div class="space-y-2">
          <div class="inline-flex items-center space-x-2 px-3 py-1 bg-[#A0C8C3]/20 text-[#A0C8C3] rounded-full text-xs font-bold uppercase">
            <span>Tourist Portal</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, {{ authService.currentUser()?.displayName }}
          </h1>
          <p class="text-sm text-slate-300">
            Track your tourism grievances, review officer updates, and rate completed resolutions.
          </p>
        </div>

        <a 
          routerLink="/citizen/submit" 
          class="bg-[#A0C8C3] text-slate-950 px-6 py-3.5 rounded-2xl font-extrabold text-sm hover:bg-teal-300 transition shadow-lg shrink-0 flex items-center space-x-2"
        >
          <span>File New Grievance</span>
        </a>
      </div>

      <!-- KPI Summary Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Filed</p>
          <p class="text-3xl font-extrabold text-slate-900">{{ totalCount() }}</p>
          <p class="text-[11px] text-slate-400">All registered complaints</p>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <p class="text-xs font-bold text-amber-600 uppercase tracking-wider">In Progress</p>
          <p class="text-3xl font-extrabold text-amber-600">{{ inProgressCount() }}</p>
          <p class="text-[11px] text-slate-400">Under officer action</p>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <p class="text-xs font-bold text-emerald-600 uppercase tracking-wider">Resolved</p>
          <p class="text-3xl font-extrabold text-emerald-600">{{ resolvedCount() }}</p>
          <p class="text-[11px] text-slate-400">Successfully closed</p>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <p class="text-xs font-bold text-purple-600 uppercase tracking-wider">Avg Response</p>
          <p class="text-3xl font-extrabold text-purple-600">24 Hrs</p>
          <p class="text-[11px] text-slate-400">Department Resolution Standard</p>
        </div>

      </div>

      <!-- Recent Grievances List -->
      <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Your Submitted Grievances</h2>
            <p class="text-xs text-slate-500">Click on any grievance to view real-time timeline & officer notes</p>
          </div>
          <a routerLink="/citizen/history" class="text-xs font-bold text-teal-700 hover:underline">View All →</a>
        </div>

        <div class="divide-y divide-slate-100">
          <div *ngFor="let g of grievanceService.roleGrievances()" class="p-5 hover:bg-slate-50 transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div class="space-y-1.5 max-w-2xl">
              <div class="flex items-center space-x-2">
                <span class="font-mono text-xs font-bold text-slate-500">{{ g.trackingCode }}</span>
                <app-status-badge [status]="g.status"></app-status-badge>
              </div>
              <h3 class="font-bold text-base text-slate-900 hover:text-teal-700 transition">
                <a [routerLink]="['/citizen/grievance', g.id]">{{ g.title }}</a>
              </h3>
              <p class="text-xs text-slate-500 line-clamp-1">{{ g.description }}</p>
              <div class="flex items-center space-x-4 text-[11px] text-slate-400 pt-1">
                <span>Location: {{ g.location }}</span>
                <span>Category: {{ g.category }}</span>
                <span>Filed: {{ g.createdAt | date:'dd/MM/yyyy' }}</span>
              </div>
            </div>

            <div class="flex items-center space-x-2 shrink-0">
              <a [routerLink]="['/citizen/grievance', g.id]" class="px-4 py-2 bg-[#0F172A] text-white rounded-xl text-xs font-bold hover:bg-slate-800">
                Track Timeline →
              </a>
            </div>
          </div>

          <div *ngIf="grievanceService.roleGrievances().length === 0" class="p-12 text-center text-slate-400">
            No grievances submitted yet. Click "File New Grievance" above to log a complaint.
          </div>
        </div>
      </div>

    </div>
  `
})
export class CitizenDashboardComponent {
  grievanceService = inject(GrievanceService);
  authService = inject(AuthService);

  totalCount(): number {
    return this.grievanceService.roleGrievances().length;
  }

  inProgressCount(): number {
    return this.grievanceService.roleGrievances().filter(g => g.status === 'assigned' || g.status === 'in_progress' || g.status === 'under_review').length;
  }

  resolvedCount(): number {
    return this.grievanceService.roleGrievances().filter(g => g.status === 'resolved' || g.status === 'closed').length;
  }
}
