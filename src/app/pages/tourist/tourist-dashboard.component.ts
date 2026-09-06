import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GrievanceService } from '../../core/services/grievance.service';
import { AuthService } from '../../core/services/auth.service';
import { StatusBadgeComponent } from '../../common/components/status-badge.component';
import { capitalizeFirstChar } from '../../core/directives/capitalize-first.directive';

@Component({
  selector: 'app-tourist-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusBadgeComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <!-- Welcome Banner -->
      <div class="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div class="space-y-2">
          <div class="inline-flex items-center space-x-2 px-3 py-1 bg-[#A0C8C3]/20 text-[#A0C8C3] rounded-full text-xs font-bold uppercase">
            <span>Tourist Portal</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-black">Welcome back, {{ authService.currentUser()?.displayName || 'Traveler' }}!</h1>
          <p class="text-slate-300 text-xs sm:text-sm max-w-xl">
            Track unresolved inquiries, monitor resolution milestones, and communicate with dedicated tourism grievance officers.
          </p>
        </div>
        <div class="flex items-center space-x-3">
          <a routerLink="/tourist/submit" class="px-5 py-3 bg-[#A0C8C3] text-slate-900 rounded-2xl font-bold text-xs hover:bg-[#8eb8b3] transition shadow-lg flex items-center space-x-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>File New Grievance</span>
          </a>
        </div>
      </div>

      <!-- Grievance Overview Section -->
      <div class="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
          <div>
            <h2 class="text-lg font-extrabold text-slate-900">Grievance Overview</h2>
            <p class="text-xs text-slate-500">Live operational status and lifecycle progress across your filed complaints</p>
          </div>
          <span class="px-3 py-1 bg-teal-50 text-teal-800 text-xs font-bold rounded-xl self-start sm:self-auto">
            {{ totalCount() }} Total Records
          </span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div class="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <span class="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Total Grievances</span>
            <p class="text-2xl sm:text-3xl font-extrabold text-slate-900">{{ totalCount() }}</p>
            <p class="text-[11px] text-slate-400">Total filed by you</p>
          </div>

          <div class="p-5 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-1">
            <span class="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider">In Investigation / Active</span>
            <p class="text-2xl sm:text-3xl font-extrabold text-amber-800">{{ activeCount() }}</p>
            <p class="text-[11px] text-amber-600">Active inquiry underway</p>
          </div>

          <div class="p-5 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-1">
            <span class="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">Successfully Resolved</span>
            <p class="text-2xl sm:text-3xl font-extrabold text-emerald-800">{{ resolvedCount() }}</p>
            <p class="text-[11px] text-emerald-600">Successfully closed</p>
          </div>

          <div class="p-5 bg-rose-50/60 rounded-2xl border border-rose-200 space-y-1">
            <span class="text-[10px] font-extrabold text-rose-700 uppercase tracking-wider">Reopened</span>
            <p class="text-2xl sm:text-3xl font-extrabold text-rose-800">{{ reopenedCount() }}</p>
            <p class="text-[11px] text-rose-600">Re-submitted inquiry</p>
          </div>

          <div class="p-5 bg-slate-100/60 rounded-2xl border border-slate-300 space-y-1">
            <span class="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Cancelled</span>
            <p class="text-2xl sm:text-3xl font-extrabold text-slate-700">{{ cancelledCount() }}</p>
            <p class="text-[11px] text-slate-500">Withdrawn by you</p>
          </div>
        </div>
      </div>

      <!-- Recent Complaints Card -->
      <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Your Submitted Grievances</h2>
            <p class="text-xs text-slate-500">Click on any grievance to view real-time timeline & officer notes</p>
          </div>
          <div class="flex items-center space-x-3 w-full sm:w-auto">
            <div class="relative w-full sm:w-64">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input 
                type="text" 
                [ngModel]="searchKeyword" 
                (ngModelChange)="onSearchChange($event)"
                placeholder="Search by Grievance Code, Title..." 
                class="w-full pl-9 pr-3.5 py-1.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#A0C8C3]"
              />
            </div>
            <a routerLink="/tourist/history" class="text-xs font-bold text-teal-700 hover:underline shrink-0 flex items-center space-x-1">
              <span>View All</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>
        </div>

        <div class="divide-y divide-slate-100">
          <div *ngFor="let g of filteredGrievances()" class="p-5 hover:bg-slate-50 transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div class="space-y-1.5 max-w-2xl">
              <div class="flex items-center space-x-2">
                <span class="font-mono text-xs font-bold text-slate-600">{{ g.trackingCode }}</span>
                <app-status-badge [status]="g.status"></app-status-badge>
              </div>
              <h3 class="font-bold text-base text-slate-900 hover:text-teal-700 transition">
                <a [routerLink]="['/tourist/grievance', g.id]">{{ g.title }}</a>
              </h3>
              <p class="text-xs text-slate-500 line-clamp-1">{{ g.description }}</p>
              <div class="flex items-center space-x-4 text-[11px] text-slate-400 pt-1">
                <span>Location: {{ g.location }}</span>
                <span>Category: {{ g.category }}</span>
                <span>Filed: {{ g.createdAt | date:'dd/MM/yyyy' }}</span>
              </div>
            </div>

            <div class="flex items-center space-x-2 shrink-0">
              <a [routerLink]="['/tourist/grievance', g.id]" class="px-4 py-2 bg-[#0F172A] text-white rounded-xl text-xs font-bold hover:bg-slate-800 flex items-center space-x-1.5">
                <span>Track Timeline</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>
          </div>

          <div *ngIf="filteredGrievances().length === 0" class="p-12 text-center text-slate-400 text-xs">
            <span *ngIf="grievanceService.roleGrievances().length === 0">No grievances submitted yet. Click "File New Grievance" above to log a complaint.</span>
            <span *ngIf="grievanceService.roleGrievances().length > 0">No grievances match your search criteria.</span>
          </div>
        </div>
      </div>

    </div>
  `
})
export class TouristDashboardComponent implements OnInit {
  grievanceService = inject(GrievanceService);
  authService = inject(AuthService);

  searchKeyword = '';

  async ngOnInit(): Promise<void> {
    await this.grievanceService.loadGrievancesFromBackend();
  }

  onSearchChange(val: string) {
    this.searchKeyword = capitalizeFirstChar(val);
  }

  filteredGrievances() {
    return this.grievanceService.roleGrievances().filter(g => {
      if (g.status === 'cancelled') return false;
      const keyword = this.searchKeyword.toLowerCase().trim();
      if (!keyword) return true;
      return (
        g.trackingCode.toLowerCase().includes(keyword) ||
        ((g as any).grievanceCode && (g as any).grievanceCode.toLowerCase().includes(keyword)) ||
        g.title.toLowerCase().includes(keyword) ||
        (g.category && g.category.toLowerCase().includes(keyword)) ||
        (g.location && g.location.toLowerCase().includes(keyword))
      );
    });
  }

  totalCount(): number {
    return this.grievanceService.roleGrievances().length;
  }

  activeCount(): number {
    return this.grievanceService.roleGrievances().filter(g =>
      g.status === 'assigned' || g.status === 'in_progress' || g.status === 'under_review' || g.status === 'submitted'
    ).length;
  }

  resolvedCount(): number {
    return this.grievanceService.roleGrievances().filter(g => g.status === 'resolved' || g.status === 'closed').length;
  }

  reopenedCount(): number {
    return this.grievanceService.roleGrievances().filter(g => g.status === 'reopened').length;
  }

  cancelledCount(): number {
    return this.grievanceService.roleGrievances().filter(g => g.status === 'cancelled').length;
  }
}

