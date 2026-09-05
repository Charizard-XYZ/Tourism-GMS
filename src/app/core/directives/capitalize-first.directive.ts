import { Directive, HostListener, inject, ElementRef } from '@angular/core';
import { NgControl } from '@angular/forms';

/**
 * Capitalizes only the first alphabetic character of a string.
 * Preserves the rest of the string exactly as entered without uppercasing it.
 */
export function capitalizeFirstChar(value: string): string {
  if (!value) return '';
  const match = value.match(/[a-zA-Z]/);
  if (!match || match.index === undefined) return value;
  const idx = match.index;
  return value.slice(0, idx) + value[idx].toUpperCase() + value.slice(idx + 1);
}

@Directive({
  selector: 'input[appCapitalizeFirst], textarea[appCapitalizeFirst]',
  standalone: true
})
export class CapitalizeFirstDirective {
  private el = inject(ElementRef);
  private control = inject(NgControl, { optional: true });

  @HostListener('input', ['$event'])
  onInput(event: Event) {
    const input = event.target as HTMLInputElement | HTMLTextAreaElement | null;
    if (!input || !input.value) return;
    const value = input.value;
    const capitalized = capitalizeFirstChar(value);
    if (capitalized !== value) {
      input.value = capitalized;
      if (this.control && this.control.control) {
        this.control.control.setValue(capitalized, { emitEvent: false });
      }
    }
  }
}
