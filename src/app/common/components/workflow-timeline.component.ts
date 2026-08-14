import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Grievance, GrievanceStatus } from '../../core/models/complaint.model';

interface TimelineStep {
  key: GrievanceStatus | 'closed';
  label: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-workflow-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full py-4">
      <div class="relative flex items-center justify-between max-w-4xl mx-auto">
        <!-- Connecting Line -->
        <div class="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 z-0"></div>
        <div 
          class="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#A0C8C3] transition-all duration-500 z-0"
          [style.width.%]="getProgressPercentage()"
        ></div>

        <!-- Steps -->
        <div 
          *ngFor="let step of steps; let idx = index" 
          class="relative z-10 flex flex-col items-center group cursor-pointer"
        >
          <!-- Step Circle -->
          <div 
            [class]="getStepCircleClass(step.key)"
            class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 shadow-md"
          >
            <span *ngIf="isCompleted(step.key)">✓</span>
            <span *ngIf="!isCompleted(step.key)">{{ idx + 1 }}</span>
          </div>

          <!-- Label -->
          <div class="mt-2 text-center">
            <p 
              [class.font-bold]="isCurrent(step.key)" 
              [class.text-[#0F172A]]="isCurrent(step.key)"
              [class.text-slate-500]="!isCurrent(step.key)"
              class="text-xs sm:text-sm font-medium"
            >
              {{ step.label }}
            </p>
            <p class="text-[10px] text-slate-400 hidden sm:block">{{ step.description }}</p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class WorkflowTimelineComponent {
  @Input() grievance!: Grievance;

  readonly steps: TimelineStep[] = [
    { key: 'submitted', label: 'Submitted', description: 'Grievance Registered', icon: '' },
    { key: 'under_review', label: 'Under Review', description: 'Verified by Admin', icon: '' },
    { key: 'assigned', label: 'Assigned', description: 'Nodal Officer Allocated', icon: '' },
    { key: 'in_progress', label: 'In Progress', description: 'Investigation & Action', icon: '' },
    { key: 'resolved', label: 'Resolved', description: 'Resolution Uploaded', icon: '' },
    { key: 'closed', label: 'Closed', description: 'Feedback & Archived', icon: '' }
  ];

  private statusOrder: Record<string, number> = {
    'submitted': 1,
    'under_review': 2,
    'assigned': 3,
    'in_progress': 4,
    'reopened': 4,
    'resolved': 5,
    'closed': 6
  };

  getCurrentIndex(): number {
    if (!this.grievance) return 1;
    return this.statusOrder[this.grievance.status] || 1;
  }

  getProgressPercentage(): number {
    const idx = this.getCurrentIndex();
    return ((idx - 1) / (this.steps.length - 1)) * 100;
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
      return 'bg-[#A0C8C3] text-slate-900 border-teal-600 ring-4 ring-teal-100 scale-110';
    } else if (this.isCompleted(stepKey)) {
      return 'bg-emerald-600 text-white border-emerald-600';
    } else {
      return 'bg-white text-slate-400 border-slate-300';
    }
  }
}
