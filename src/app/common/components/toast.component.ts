import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div 
      *ngIf="message" 
      role="alert"
      class="fixed bottom-6 right-6 z-50 flex items-center space-x-3 bg-slate-900/95 text-white px-5 py-3.5 rounded-2xl shadow-2xl border-l-4 backdrop-blur-md animate-slide-up max-w-md transition-all"
      [ngClass]="getToastBorderClass()"
    >
      <app-icon [name]="getToastIcon()" size="w-5 h-5" [class]="getToastIconClass()"></app-icon>
      <span class="text-xs sm:text-sm font-medium leading-snug flex-1">{{ message }}</span>
      <button 
        type="button"
        (click)="dismiss.emit()" 
        aria-label="Close notification"
        class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition shrink-0"
      >
        <app-icon name="x" size="w-4 h-4"></app-icon>
      </button>
    </div>
  `
})
export class ToastComponent implements OnChanges, OnDestroy {
  @Input() message: string | null = null;
  @Input() duration: number = 4000;
  @Output() dismiss = new EventEmitter<void>();

  private autoDismissTimer: any = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['message'] && this.message) {
      if (this.autoDismissTimer) {
        clearTimeout(this.autoDismissTimer);
      }
      this.autoDismissTimer = setTimeout(() => {
        this.dismiss.emit();
      }, this.duration);
    }
  }

  ngOnDestroy(): void {
    if (this.autoDismissTimer) {
      clearTimeout(this.autoDismissTimer);
    }
  }

  isError(): boolean {
    if (!this.message) return false;
    const lower = this.message.toLowerCase();
    return lower.includes('error') || lower.includes('fail') || lower.includes('denied') || lower.includes('invalid') || lower.includes('incorrect');
  }

  isWarning(): boolean {
    if (!this.message) return false;
    const lower = this.message.toLowerCase();
    return lower.includes('warning') || lower.includes('required') || lower.includes('caution');
  }

  getToastIcon(): string {
    if (this.isError()) return 'alert-circle';
    if (this.isWarning()) return 'alert-triangle';
    return 'check-circle';
  }

  getToastIconClass(): string {
    if (this.isError()) return 'text-rose-400 shrink-0';
    if (this.isWarning()) return 'text-amber-400 shrink-0';
    return 'text-[#A0C8C3] shrink-0';
  }

  getToastBorderClass(): string {
    if (this.isError()) return 'border-rose-500';
    if (this.isWarning()) return 'border-amber-500';
    return 'border-[#A0C8C3]';
  }
}
