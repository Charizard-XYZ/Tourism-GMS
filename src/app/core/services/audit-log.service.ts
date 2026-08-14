import { Injectable, signal } from '@angular/core';
import { ActivityLog } from '../models/activity-log.model';
import { UserRole } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuditLogService {
  private initialLogs: ActivityLog[] = [];

  readonly logs = signal<ActivityLog[]>(this.initialLogs);

  log(userId: string, userName: string, userRole: UserRole, action: string, targetCollection: string, targetId: string, details: string): void {
    const newEntry: ActivityLog = {
      id: `log-${Date.now().toString().slice(-4)}`,
      userId,
      userName,
      userRole,
      action,
      targetCollection,
      targetId,
      details,
      timestamp: new Date().toISOString(),
      ipAddress: '127.0.0.1'
    };

    this.logs.update(current => [newEntry, ...current]);
  }
}
