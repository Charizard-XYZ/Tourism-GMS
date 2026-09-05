import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Grievance, GrievanceCategory, GrievanceStatus } from '../models/complaint.model';
import { GrievanceComment } from '../models/comment.model';
import { Feedback } from '../models/feedback.model';
import { AuthService } from './auth.service';
import { AuditLogService } from './audit-log.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GrievanceService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private auditLogService = inject(AuditLogService);
  private apiUrl = environment.apiBaseUrl;

  readonly grievances = signal<Grievance[]>([]);
  readonly comments = signal<GrievanceComment[]>([]);
  readonly feedbacks = signal<Feedback[]>([]);

  private currentGrievanceRequestId = 0;

  constructor() {
    // Wait for authentication initialization before loading protected data
    effect(() => {
      const isInit = this.authService.isInitialized();
      const user = this.authService.currentUser();

      if (!isInit) {
        // Do NOT load protected grievance data prematurely before auth is initialized
        return;
      }

      if (user) {
        // Authenticated user profile is ready: load role-scoped data
        this.loadGrievancesFromBackend();
        this.loadCommentsFromBackend();
        this.loadFeedbacksFromBackend();
      } else {
        // User logged out: cleanly reset grievance state
        this.grievances.set([]);
        this.comments.set([]);
        this.feedbacks.set([]);
      }
    }, { allowSignalWrites: true });
  }

  async loadGrievancesFromBackend(): Promise<void> {
    await this.authService.ensureInitialized();
    const user = this.authService.currentUser();
    if (!user) {
      this.grievances.set([]);
      return;
    }

    const requestId = ++this.currentGrievanceRequestId;

    try {
      const res = await firstValueFrom(this.http.get<{ success: boolean; grievances: Grievance[] }>(`${this.apiUrl}/grievances`));
      // Only commit to state if this is still the latest request (prevents stale/race overwrites)
      if (requestId === this.currentGrievanceRequestId) {
        if (res && res.success && Array.isArray(res.grievances)) {
          this.grievances.set(res.grievances);
        }
      }
    } catch (e) {
      if (requestId === this.currentGrievanceRequestId) {
        console.warn('Failed to load grievances from backend:', e);
      }
    }
  }

  async loadCommentsFromBackend(grievanceId?: string): Promise<void> {
    await this.authService.ensureInitialized();
    if (!this.authService.currentUser()) {
      this.comments.set([]);
      return;
    }
    try {
      const url = grievanceId ? `${this.apiUrl}/comments?grievanceId=${grievanceId}` : `${this.apiUrl}/comments`;
      const res = await firstValueFrom(this.http.get<{ success: boolean; comments: GrievanceComment[] }>(url));
      if (res && res.success && Array.isArray(res.comments)) {
        this.comments.set(res.comments);
      }
    } catch (e) {
      console.warn('Failed to load comments from backend:', e);
    }
  }

  async loadFeedbacksFromBackend(): Promise<void> {
    await this.authService.ensureInitialized();
    if (!this.authService.currentUser()) {
      this.feedbacks.set([]);
      return;
    }
    try {
      const res = await firstValueFrom(this.http.get<{ success: boolean; feedbacks: Feedback[] }>(`${this.apiUrl}/feedback`));
      if (res && res.success && Array.isArray(res.feedbacks)) {
        this.feedbacks.set(res.feedbacks);
      }
    } catch (e) {
      console.warn('Failed to load feedbacks from backend:', e);
    }
  }

  // Computed Role Filtered Grievances
  readonly roleGrievances = computed(() => {
    const user = this.authService.currentUser();
    const list = this.grievances();
    if (!user) return [];

    if (user.role === 'admin') {
      return list;
    } else if (user.role === 'officer') {
      const officerDeptId = user.departmentId;
      const officerDeptName = (user.departmentName || '').trim().toLowerCase();
      return list.filter(g => {
        const gDeptId = g.departmentId;
        const gDeptName = (g.departmentName || g.category || '').trim().toLowerCase();

        return (officerDeptId && gDeptId === officerDeptId) ||
          (officerDeptName && officerDeptName !== 'unassigned' && gDeptName === officerDeptName) ||
          (g.assignedOfficerId === user.uid) ||
          (g.assignedOfficerName === user.displayName) ||
          (g.assignedOfficerId === user.email);
      });
    } else {
      // Tourist
      return list.filter(g => (g.touristId === user.uid || g.touristEmail === user.email));
    }
  });

  getGrievanceById(id: string): Grievance | undefined {
    return this.grievances().find(g => g.id === id || g.trackingCode === id || g.grievanceCode === id);
  }

  getCommentsForGrievance(grievanceId: string): GrievanceComment[] {
    const userRole = this.authService.userRole();
    return this.comments().filter(c => {
      if (c.grievanceId !== grievanceId) return false;
      if (userRole === 'tourist' && c.isInternalOnly) return false;
      return true;
    });
  }

  /**
   * Submit Grievance (Tourist)
   */
  async submitGrievance(data: Omit<Grievance, 'id' | 'trackingCode' | 'status' | 'createdAt' | 'updatedAt' | 'isEscalated'>): Promise<Grievance> {
    const res = await firstValueFrom(this.http.post<{ success: boolean; grievance: Grievance }>(`${this.apiUrl}/grievances`, data));
    if (!res || !res.success) {
      throw new Error('Failed to submit grievance to backend server.');
    }

    if (res.grievance) {
      this.grievances.update(prev => {
        const filtered = prev.filter(g => g.id !== res.grievance.id);
        return [res.grievance, ...filtered];
      });
    }

    await this.loadGrievancesFromBackend();
    return res.grievance;
  }

  /**
   * Assign Grievance to Department & Officer (Admin)
   */
  async assignGrievance(grievanceId: string, departmentId: string, departmentName: string, officerId: string, officerName: string): Promise<void> {
    await firstValueFrom(this.http.patch(`${this.apiUrl}/grievances/${grievanceId}/assign`, {
      departmentId,
      departmentName,
      officerId,
      officerName
    }));
    await this.loadGrievancesFromBackend();
  }

  /**
   * Update Status (Officer / Admin)
   */
  async updateStatus(grievanceId: string, newStatus: GrievanceStatus, resolutionDetails?: string, resolutionFiles?: any[]): Promise<void> {
    await firstValueFrom(this.http.patch(`${this.apiUrl}/grievances/${grievanceId}/status`, {
      status: newStatus,
      resolutionDetails,
      resolutionAttachments: resolutionFiles
    }));
    await this.loadGrievancesFromBackend();
  }

  /**
   * Add Comment (Officer / Admin / Tourist)
   */
  async addComment(grievanceId: string, commentText: string, isInternalOnly: boolean = false): Promise<void> {
    await firstValueFrom(this.http.post(`${this.apiUrl}/comments`, {
      grievanceId,
      commentText,
      isInternalOnly
    }));
    await this.loadCommentsFromBackend(grievanceId);
  }

  async fetchGrievanceById(id: string): Promise<Grievance | null> {
    try {
      const res = await firstValueFrom(this.http.get<{ success: boolean; grievance: Grievance }>(`${this.apiUrl}/grievances/${id}`));
      if (res && res.success && res.grievance) {
        const existing = this.grievances();
        const idx = existing.findIndex(g => g.id === res.grievance.id);
        if (idx >= 0) {
          existing[idx] = res.grievance;
          this.grievances.set([...existing]);
        } else {
          this.grievances.set([...existing, res.grievance]);
        }
        return res.grievance;
      }
    } catch (e) {
      console.warn(`Failed to fetch grievance ${id} directly from backend:`, e);
    }
    return this.getGrievanceById(id) || null;
  }

  /**
   * Cancel Grievance (Tourist)
   */
  async cancelGrievance(grievanceId: string): Promise<void> {
    await firstValueFrom(this.http.patch(`${this.apiUrl}/grievances/${grievanceId}/cancel`, {}));
    await this.loadGrievancesFromBackend();
  }

  /**
   * Permanently Delete Cancelled Grievance (Tourist or Admin)
   */
  async deleteGrievance(grievanceId: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.apiUrl}/grievances/${grievanceId}`));
    await this.loadGrievancesFromBackend();
  }

  /**
   * Reopen Grievance (Tourist)
   */
  async reopenGrievance(grievanceId: string, reason: string): Promise<void> {
    await this.updateStatus(grievanceId, 'reopened');
    await this.addComment(grievanceId, `[REOPENED TICKET]: ${reason}`, false);
  }

  /**
   * Submit Feedback / Rating (Tourist)
   */
  async submitFeedback(grievanceId: string, rating: number, comments: string, autoClose: boolean = true): Promise<void> {
    await firstValueFrom(this.http.post(`${this.apiUrl}/feedback`, {
      grievanceId,
      rating,
      comments,
      autoClose
    }));
    await this.loadGrievancesFromBackend();
    await this.loadFeedbacksFromBackend();
  }

  clearState(): void {
    this.grievances.set([]);
    this.comments.set([]);
    this.feedbacks.set([]);
  }
}
