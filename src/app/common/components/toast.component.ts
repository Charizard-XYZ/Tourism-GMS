import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="message" class="fixed bottom-6 right-6 z-50 flex items-center space-x-3 bg-[#0F172A] text-white px-5 py-3.5 rounded-xl shadow-2xl border-l-4 border-[#A0C8C3] animate-bounce">
      <span class="text-xl"></span>
      <span class="text-sm font-medium">{{ message }}</span>
      <button (click)="dismiss.emit()" class="text-slate-400 hover:text-white ml-3">✕</button>
    </div>
  `
})
export class ToastComponent {
  @Input() message: string | null = null;
  @Output() dismiss = new EventEmitter<void>();
}
