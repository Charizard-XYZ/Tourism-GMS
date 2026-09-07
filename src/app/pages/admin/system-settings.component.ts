import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastComponent } from '../../common/components/toast.component';
import { IconComponent } from '../../common/components/icon.component';

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastComponent, IconComponent],
  template: `
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div class="inline-flex items-center space-x-2 px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-xs font-bold uppercase mb-2">
          <app-icon name="settings" size="w-3.5 h-3.5"></app-icon>
          <span>System Administration</span>
        </div>
        <h1 class="text-2xl font-extrabold text-slate-900">System Configuration & Policy</h1>
        <p class="text-xs text-slate-500">Global portal thresholds and resolution hours</p>
      </div>

      <div class="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        
        <div class="space-y-4">
          <h3 class="font-bold text-sm text-slate-900 border-b pb-2">SLA Resolution Deadlines</h3>
          
          <div class="grid sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Standard Resolution Deadline (Hours)</label>
              <input type="number" [(ngModel)]="slaStandardHours" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" class="w-full px-3 py-2 border rounded-xl" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Urgent/Safety Resolution (Hours)</label>
              <input type="number" [(ngModel)]="slaUrgentHours" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" class="w-full px-3 py-2 border rounded-xl" />
            </div>
          </div>
        </div>

        <div class="space-y-4 pt-4 border-t">
          <h3 class="font-bold text-sm text-slate-900 border-b pb-2">Auto-Escalation Thresholds</h3>
          
          <label class="flex items-center space-x-3 text-xs text-slate-700 cursor-pointer">
            <input type="checkbox" [(ngModel)]="autoEscalateSla" class="rounded text-rose-600" />
            <span>Automatically escalate to Directorate Admin if Officer does not update status within 24h.</span>
          </label>

        </div>

        <button 
          (click)="saveSettings()" 
          [disabled]="isSaving()"
          class="px-6 py-3 bg-[#0F172A] text-white rounded-xl text-xs font-bold hover:bg-slate-800 shadow-lg flex items-center justify-center space-x-2 min-h-[44px] min-w-[220px] disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <app-icon *ngIf="isSaving()" name="loader" size="w-4 h-4" class="animate-spin shrink-0"></app-icon>
          <app-icon *ngIf="!isSaving()" name="check-circle" size="w-4 h-4 text-emerald-400 shrink-0"></app-icon>
          <span>{{ isSaving() ? 'Saving...' : 'Save System Configuration' }}</span>
        </button>

      </div>

      <app-toast [message]="toastMessage()" (dismiss)="toastMessage.set(null)"></app-toast>

    </div>
  `
})
export class SystemSettingsComponent {
  slaStandardHours = 48;
  slaUrgentHours = 12;
  autoEscalateSla = true;
  notifySms = true;

  toastMessage = signal<string | null>(null);
  isSaving = signal<boolean>(false);

  async saveSettings() {
    if (this.isSaving()) return;
    this.isSaving.set(true);
    try {
      // Simulate persistence delay
      await new Promise(resolve => setTimeout(resolve, 600));
      this.toastMessage.set('System settings updated successfully.');
    } finally {
      this.isSaving.set(false);
    }
  }
}
