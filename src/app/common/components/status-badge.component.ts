import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GrievanceStatus } from '../../core/models/complaint.model';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span *ngIf="status" [class]="getStatusClass(status)" class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
      <span class="w-1.5 h-1.5 rounded-full mr-1.5" [class]="getStatusDotClass(status)"></span>
      {{ formatStatus(status) }}
    </span>
  `
})
export class StatusBadgeComponent {
  @Input() status?: GrievanceStatus;

  formatStatus(status: GrievanceStatus): string {
    return status.replace('_', ' ');
  }

  getStatusClass(status: GrievanceStatus): string {
    switch (status) {
      case 'submitted':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'under_review':
        return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'assigned':
        return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
      case 'in_progress':
        return 'bg-amber-50 text-amber-800 border border-amber-200';
      case 'resolved':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'reopened':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'closed':
        return 'bg-slate-100 text-slate-700 border border-slate-300';
      default:
        return 'bg-slate-50 text-slate-600';
    }
  }

  getStatusDotClass(status: GrievanceStatus): string {
    switch (status) {
      case 'submitted': return 'bg-blue-500';
      case 'under_review': return 'bg-purple-500';
      case 'assigned': return 'bg-indigo-500';
      case 'in_progress': return 'bg-amber-500 animate-pulse';
      case 'resolved': return 'bg-emerald-500';
      case 'reopened': return 'bg-rose-500 animate-ping';
      case 'closed': return 'bg-slate-500';
      default: return 'bg-slate-400';
    }
  }
}
