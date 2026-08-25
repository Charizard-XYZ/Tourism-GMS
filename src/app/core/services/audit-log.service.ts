import { Injectable, signal, inject } from '@angular/core';
import { ActivityLog } from '../models/activity-log.model';
import { UserRole } from '../models/user.model';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: 'root'
})
export class AuditLogService {
  private firebaseService = inject(FirebaseService);
  private initialLogs: ActivityLog[] = [];

  readonly logs = signal<ActivityLog[]>(this.initialLogs);

  constructor() {
    this.syncFromBackend();
  }

  async syncFromBackend() {
    const remote = await this.firebaseService.fetchApi<ActivityLog[]>('/audit-logs');
    if (remote && Array.isArray(remote)) {
      this.logs.set(remote);
    }
  }

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

    // Push to Firebase REST API
    this.firebaseService.fetchApi<ActivityLog>('/audit-logs', {
      method: 'POST',
      body: JSON.stringify(newEntry)
    });
  }
}
