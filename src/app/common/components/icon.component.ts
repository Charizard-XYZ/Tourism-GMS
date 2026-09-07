import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type IconName =
  | 'home'
  | 'dashboard'
  | 'user'
  | 'users'
  | 'user-plus'
  | 'user-x'
  | 'user-check'
  | 'shield'
  | 'building'
  | 'file-text'
  | 'file-check'
  | 'file-plus'
  | 'file'
  | 'clock'
  | 'history'
  | 'clipboard-list'
  | 'clipboard-edit'
  | 'briefcase'
  | 'inbox'
  | 'search'
  | 'filter'
  | 'plus'
  | 'edit'
  | 'trash'
  | 'x'
  | 'x-circle'
  | 'check'
  | 'check-circle'
  | 'eye'
  | 'eye-off'
  | 'alert-triangle'
  | 'alert-circle'
  | 'info'
  | 'star'
  | 'star-outline'
  | 'settings'
  | 'log-out'
  | 'log-in'
  | 'arrow-left'
  | 'arrow-right'
  | 'menu'
  | 'refresh'
  | 'bar-chart'
  | 'trending-up'
  | 'phone'
  | 'mail'
  | 'map-pin'
  | 'lock'
  | 'key'
  | 'external-link'
  | 'download'
  | 'send'
  | 'message-square'
  | 'bell'
  | 'loader'
  | 'spinner';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      [attr.viewBox]="'0 0 24 24'"
      [attr.fill]="isFilledStar() ? 'currentColor' : 'none'"
      [attr.stroke]="'currentColor'"
      [attr.stroke-width]="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
      [style.width.px]="numericSize"
      [style.height.px]="numericSize"
      [class]="computedClass"
      aria-hidden="true"
    >
      <ng-container [ngSwitch]="name">
        <!-- Home -->
        <ng-container *ngSwitchCase="'home'">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </ng-container>

        <!-- Dashboard (layout-dashboard) -->
        <ng-container *ngSwitchCase="'dashboard'">
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        </ng-container>

        <!-- User / Profile -->
        <ng-container *ngSwitchCase="'user'">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </ng-container>

        <!-- Users -->
        <ng-container *ngSwitchCase="'users'">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </ng-container>

        <!-- User Plus -->
        <ng-container *ngSwitchCase="'user-plus'">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" x2="19" y1="8" y2="14" />
          <line x1="22" x2="16" y1="11" y2="11" />
        </ng-container>

        <!-- User X (Revoke) -->
        <ng-container *ngSwitchCase="'user-x'">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="17" x2="22" y1="8" y2="13" />
          <line x1="22" x2="17" y1="8" y2="13" />
        </ng-container>

        <!-- User Check (Restore) -->
        <ng-container *ngSwitchCase="'user-check'">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <polyline points="16 11 18 13 22 9" />
        </ng-container>

        <!-- Shield / Officer -->
        <ng-container *ngSwitchCase="'shield'">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </ng-container>

        <!-- Building / Department -->
        <ng-container *ngSwitchCase="'building'">
          <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
          <path d="M9 22v-4h6v4" />
          <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
        </ng-container>

        <!-- Grievance / File-Text -->
        <ng-container *ngSwitchCase="'file-text'">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" x2="8" y1="13" y2="13" />
          <line x1="16" x2="8" y1="17" y2="17" />
          <line x1="10" x2="8" y1="9" y2="9" />
        </ng-container>

        <!-- File Check -->
        <ng-container *ngSwitchCase="'file-check'">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="m9 15 2 2 4-4" />
        </ng-container>

        <!-- File Plus -->
        <ng-container *ngSwitchCase="'file-plus'">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" x2="12" y1="18" y2="12" />
          <line x1="9" x2="15" y1="15" y2="15" />
        </ng-container>

        <!-- Generic File -->
        <ng-container *ngSwitchCase="'file'">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
        </ng-container>

        <!-- Clock / History -->
        <ng-container *ngSwitchCase="'clock'">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </ng-container>

        <ng-container *ngSwitchCase="'history'">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
          <polyline points="12 7 12 12 15 15" />
        </ng-container>

        <!-- Clipboard List / Workqueue -->
        <ng-container *ngSwitchCase="'clipboard-list'">
          <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01" />
        </ng-container>

        <!-- Clipboard Edit / Process -->
        <ng-container *ngSwitchCase="'clipboard-edit'">
          <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <path d="M10.4 12.6a2 2 0 1 1 3 3L9 20l-4 1 1-4Z" />
        </ng-container>

        <!-- Briefcase / Assigned Cases -->
        <ng-container *ngSwitchCase="'briefcase'">
          <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </ng-container>

        <!-- Inbox / Grievance Desk -->
        <ng-container *ngSwitchCase="'inbox'">
          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
          <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </ng-container>

        <!-- Search -->
        <ng-container *ngSwitchCase="'search'">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" x2="16.65" y1="21" y2="16.65" />
        </ng-container>

        <!-- Filter -->
        <ng-container *ngSwitchCase="'filter'">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </ng-container>

        <!-- Plus / Add -->
        <ng-container *ngSwitchCase="'plus'">
          <line x1="12" x2="12" y1="5" y2="19" />
          <line x1="5" x2="19" y1="12" y2="12" />
        </ng-container>

        <!-- Edit / Pencil -->
        <ng-container *ngSwitchCase="'edit'">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        </ng-container>

        <!-- Trash / Delete -->
        <ng-container *ngSwitchCase="'trash'">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" x2="10" y1="11" y2="17" />
          <line x1="14" x2="14" y1="11" y2="17" />
        </ng-container>

        <!-- X / Close -->
        <ng-container *ngSwitchCase="'x'">
          <line x1="18" x2="6" y1="6" y2="18" />
          <line x1="6" x2="18" y1="6" y2="18" />
        </ng-container>

        <!-- X Circle / Cancel -->
        <ng-container *ngSwitchCase="'x-circle'">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" x2="9" y1="9" y2="15" />
          <line x1="9" x2="15" y1="9" y2="15" />
        </ng-container>

        <!-- Check -->
        <ng-container *ngSwitchCase="'check'">
          <polyline points="20 6 9 17 4 12" />
        </ng-container>

        <!-- Check Circle / Resolved -->
        <ng-container *ngSwitchCase="'check-circle'">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </ng-container>

        <!-- Eye / View / Check Grievance -->
        <ng-container *ngSwitchCase="'eye'">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </ng-container>

        <!-- Eye Off (Hide Password) -->
        <ng-container *ngSwitchCase="'eye-off'">
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
          <line x1="2" x2="22" y1="2" y2="22" />
        </ng-container>

        <!-- Alert Triangle / Warning -->
        <ng-container *ngSwitchCase="'alert-triangle'">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" x2="12" y1="9" y2="13" />
          <line x1="12" x2="12.01" y1="17" y2="17" />
        </ng-container>

        <!-- Alert Circle -->
        <ng-container *ngSwitchCase="'alert-circle'">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" x2="12" y1="8" y2="12" />
          <line x1="12" x2="12.01" y1="16" y2="16" />
        </ng-container>

        <!-- Info -->
        <ng-container *ngSwitchCase="'info'">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" x2="12" y1="16" y2="12" />
          <line x1="12" x2="12.01" y1="8" y2="8" />
        </ng-container>

        <!-- Star (Feedback / Rating) -->
        <ng-container *ngSwitchCase="'star'">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </ng-container>

        <!-- Star Outline -->
        <ng-container *ngSwitchCase="'star-outline'">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </ng-container>

        <!-- Settings -->
        <ng-container *ngSwitchCase="'settings'">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </ng-container>

        <!-- Log Out -->
        <ng-container *ngSwitchCase="'log-out'">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" x2="9" y1="12" y2="12" />
        </ng-container>

        <!-- Log In / Auth -->
        <ng-container *ngSwitchCase="'log-in'">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" x2="3" y1="12" y2="12" />
        </ng-container>

        <!-- Arrow Left / Back -->
        <ng-container *ngSwitchCase="'arrow-left'">
          <line x1="19" x2="5" y1="12" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </ng-container>

        <!-- Arrow Right -->
        <ng-container *ngSwitchCase="'arrow-right'">
          <line x1="5" x2="19" y1="12" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </ng-container>

        <!-- Menu (Hamburger) -->
        <ng-container *ngSwitchCase="'menu'">
          <line x1="4" x2="20" y1="12" y2="12" />
          <line x1="4" x2="20" y1="6" y2="6" />
          <line x1="4" x2="20" y1="18" y2="18" />
        </ng-container>

        <!-- Refresh / Reopen -->
        <ng-container *ngSwitchCase="'refresh'">
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M8 16H3v5" />
        </ng-container>

        <!-- Bar Chart / Reports -->
        <ng-container *ngSwitchCase="'bar-chart'">
          <line x1="12" x2="12" y1="20" y2="10" />
          <line x1="18" x2="18" y1="20" y2="4" />
          <line x1="6" x2="6" y1="20" y2="16" />
        </ng-container>

        <!-- Trending Up -->
        <ng-container *ngSwitchCase="'trending-up'">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </ng-container>

        <!-- Phone -->
        <ng-container *ngSwitchCase="'phone'">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </ng-container>

        <!-- Mail -->
        <ng-container *ngSwitchCase="'mail'">
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </ng-container>

        <!-- Map Pin -->
        <ng-container *ngSwitchCase="'map-pin'">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </ng-container>

        <!-- Lock -->
        <ng-container *ngSwitchCase="'lock'">
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </ng-container>

        <!-- Key -->
        <ng-container *ngSwitchCase="'key'">
          <circle cx="7.5" cy="15.5" r="5.5" />
          <path d="m21 2-9.6 9.6" />
          <path d="m15.5 7.5 3 3L22 7l-3-3" />
        </ng-container>

        <!-- External Link -->
        <ng-container *ngSwitchCase="'external-link'">
          <path d="M15 3h6v6" />
          <path d="M10 14 21 3" />
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        </ng-container>

        <!-- Download -->
        <ng-container *ngSwitchCase="'download'">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" x2="12" y1="15" y2="3" />
        </ng-container>

        <!-- Send -->
        <ng-container *ngSwitchCase="'send'">
          <line x1="22" x2="11" y1="2" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </ng-container>

        <!-- Message Square / Comments -->
        <ng-container *ngSwitchCase="'message-square'">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </ng-container>

        <!-- Bell (Notifications) -->
        <ng-container *ngSwitchCase="'bell'">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </ng-container>

        <!-- Loader / Spinner -->
        <ng-container *ngSwitchCase="'loader'">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </ng-container>

        <ng-container *ngSwitchCase="'spinner'">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </ng-container>
      </ng-container>
    </svg>
  `
})
export class IconComponent {
  @Input({ required: true }) name!: IconName | string;
  @Input() size?: number | string;
  @Input() strokeWidth: number = 2;
  @Input() filled: boolean = false;
  @Input() class?: string;

  get numericSize(): number | null {
    if (typeof this.size === 'number') {
      return this.size;
    }
    if (typeof this.size === 'string' && !isNaN(Number(this.size))) {
      return Number(this.size);
    }
    return null;
  }

  get computedClass(): string {
    const defaultClasses = 'shrink-0 inline-block';
    let sizeClasses = '';

    if (typeof this.size === 'string' && isNaN(Number(this.size))) {
      // It's a Tailwind size class string like "w-4 h-4" or "w-5 h-5"
      sizeClasses = this.size;
    } else if (!this.size && (!this.class || (!this.class.includes('w-') && !this.class.includes('h-')))) {
      sizeClasses = 'w-4 h-4';
    }

    const customClass = this.class || '';
    return [defaultClasses, sizeClasses, customClass].filter(Boolean).join(' ');
  }

  isFilledStar(): boolean {
    return this.filled || (this.name === 'star' && this.filled);
  }
}
