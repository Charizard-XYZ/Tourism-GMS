import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Grievance, GrievanceStatus } from '../../core/models/complaint.model';

interface TimelineStep {
  key: GrievanceStatus | 'closed';
  label: string;
  shortLabel: string;
  description: string;
}

@Component({
  selector: 'app-workflow-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full space-y-6 py-2">
      
      <!-- Top Live Status Header Summary Pill Bar -->
      <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
        <div class="flex items-center space-x-3">
          <div class="w-3 h-3 rounded-full animate-ping" [ngClass]="getStatusPingClass()"></div>
          <div>
            <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Current Status</span>
            <div class="flex items-center space-x-2">
              <span class="font-extrabold text-sm text-slate-900">{{ getFormattedCurrentStatus() }}</span>
              <span *ngIf="grievance?.isEscalated" class="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-black uppercase rounded-md">Escalated</span>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-4 text-xs">
          <div *ngIf="grievance?.assignedOfficerName" class="text-right">
            <span class="text-slate-400 block text-[10px] font-bold uppercase">Assigned Officer</span>
            <span class="font-bold text-slate-800">{{ grievance.assignedOfficerName }}</span>
          </div>
          <div *ngIf="grievance?.departmentName || grievance?.category" class="text-right">
            <span class="text-slate-400 block text-[10px] font-bold uppercase">Department</span>
            <span class="font-bold text-teal-800">{{ grievance.departmentName || grievance.category }}</span>
          </div>
        </div>
      </div>

      <!-- Horizontal Stepper Progress Bar -->
      <div class="relative px-2">
        <div class="relative flex items-center justify-between max-w-4xl mx-auto">
          <!-- Background Line -->
          <div class="absolute left-6 right-6 top-5 -translate-y-1/2 h-1 bg-slate-200 z-0"></div>
          <!-- Active Filled Line -->
          <div 
            class="absolute left-6 top-5 -translate-y-1/2 h-1 bg-teal-600 transition-all duration-700 z-0 rounded-full"
            [style.width.%]="getProgressPercentage()"
          ></div>

          <!-- Steps Loop -->
          <div 
            *ngFor="let step of steps; let idx = index" 
            class="relative z-10 flex flex-col items-center group"
          >
            <!-- Circle Badge Indicator -->
            <div 
              [class]="getStepCircleClass(step.key)"
              class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all duration-300 shadow-md"
            >
              <span *ngIf="isCompleted(step.key)">✓</span>
              <span *ngIf="!isCompleted(step.key)">{{ idx + 1 }}</span>
            </div>

            <!-- Labels & Details -->
            <div class="mt-2 text-center max-w-[100px] sm:max-w-[120px]">
              <p 
                [class.font-extrabold]="isCurrent(step.key)" 
                [class.text-teal-900]="isCurrent(step.key)"
                [class.text-emerald-700]="isCompleted(step.key)"
                [class.text-slate-400]="!isCurrent(step.key) && !isCompleted(step.key)"
                class="text-xs sm:text-sm leading-snug"
              >
                {{ step.label }}
              </p>
              <span 
                *ngIf="isCurrent(step.key)" 
                class="inline-block mt-1 px-2 py-0.5 bg-teal-100 text-teal-800 text-[9px] font-extrabold uppercase rounded-full"
              >
                Active Step
              </span>
              <p class="text-[10px] text-slate-400 hidden sm:block mt-0.5 line-clamp-1">{{ step.description }}</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  `
})
export class WorkflowTimelineComponent {
  @Input() grievance!: Grievance;

  readonly steps: TimelineStep[] = [
    { key: 'submitted', label: 'Submitted', shortLabel: 'Filed', description: 'Grievance Registered' },
    { key: 'assigned', label: 'Assigned', shortLabel: 'Assigned', description: 'Officer Allocated' },
    { key: 'in_progress', label: 'In Progress', shortLabel: 'Investigating', description: 'Investigation & Action' },
    { key: 'resolved', label: 'Resolved', shortLabel: 'Resolved', description: 'Resolution Uploaded' },
    { key: 'closed', label: 'Closed', shortLabel: 'Archived', description: 'Feedback & Archived' }
  ];

  private statusOrder: Record<string, number> = {
    'submitted': 1,
    'assigned': 2,
    'in_progress': 3,
    'reopened': 3,
    'resolved': 4,
    'closed': 5
  };

  getCurrentIndex(): number {
    if (!this.grievance) return 1;
    return this.statusOrder[this.grievance.status] || 1;
  }

  getProgressPercentage(): number {
    const idx = this.getCurrentIndex();
    const max = this.steps.length;
    if (idx <= 1) return 0;
    if (idx >= max) return 100;
    return ((idx - 1) / (max - 1)) * 100;
  }

  isCompleted(stepKey: string): boolean {
    const stepIdx = this.statusOrder[stepKey] || 0;
    return stepIdx < this.getCurrentIndex();
  }

  isCurrent(stepKey: string): boolean {
    const stepIdx = this.statusOrder[stepKey] || 0;
    return stepIdx === this.getCurrentIndex();
  }

  getStepCircleClass(stepKey: string): string {
    if (this.isCurrent(stepKey)) {
      return 'bg-teal-700 text-white border-teal-800 ring-4 ring-teal-200 scale-110 shadow-lg';
    } else if (this.isCompleted(stepKey)) {
      return 'bg-emerald-600 text-white border-emerald-600';
    } else {
      return 'bg-white text-slate-400 border-slate-300';
    }
  }

  getStatusPingClass(): string {
    if (!this.grievance) return 'bg-slate-400';
    switch (this.grievance.status) {
      case 'submitted': return 'bg-amber-500';
      case 'assigned': return 'bg-blue-500';
      case 'in_progress': return 'bg-indigo-500';
      case 'reopened': return 'bg-rose-500';
      case 'resolved': return 'bg-emerald-500';
      case 'closed': return 'bg-slate-600';
      default: return 'bg-teal-500';
    }
  }

  getFormattedCurrentStatus(): string {
    if (!this.grievance) return 'Submitted';
    switch (this.grievance.status) {
      case 'submitted': return '1. Grievance Registered & Pending Officer Assignment';
      case 'assigned': return `2. Assigned to Officer (${this.grievance.assignedOfficerName || 'Officer'})`;
      case 'in_progress': return '3. Under Investigation & Action by Officer';
      case 'reopened': return '3. Reopened Ticket under Re-investigation';
      case 'resolved': return '4. Resolution Executed & Proof Uploaded';
      case 'closed': return '5. Grievance Ticket Closed & Archived';
      default: return this.grievance.status.toUpperCase();
    }
  }
}
