import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ActivityLog } from '../models/activity-log.model';
import { UserRole } from '../models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuditLogService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiBaseUrl;

  readonly logs = signal<ActivityLog[]>([]);

  constructor() {
    this.loadLogsFromBackend();
  }

  async loadLogsFromBackend(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<{ success: boolean; logs: ActivityLog[] }>(`${this.apiUrl}/activity-logs`));
      if (res && res.success && Array.isArray(res.logs)) {
        this.logs.set(res.logs);
      }
    } catch (e) {
      console.warn('Failed to load activity logs from backend:', e);
    }
  }

  async log(userId: string, userName: string, userRole: UserRole, action: string, targetCollection: string, targetId: string, details: string): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.apiUrl}/activity-logs`, {
        action,
        module: targetCollection,
        targetId,
        details
      }));
      await this.loadLogsFromBackend();
    } catch (e) {
      console.warn('Failed to send activity log to backend:', e);
    }
  }
}
