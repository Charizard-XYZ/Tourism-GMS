import { Injectable, signal, computed, inject } from '@angular/core';
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

  constructor() {
    this.loadGrievancesFromBackend();
    this.loadCommentsFromBackend();
    this.loadFeedbacksFromBackend();
  }

  async loadGrievancesFromBackend(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<{ success: boolean; grievances: Grievance[] }>(`${this.apiUrl}/grievances`));
      if (res && res.success && Array.isArray(res.grievances)) {
        this.grievances.set(res.grievances);
      }
    } catch (e) {
      console.warn('Failed to load grievances from backend:', e);
    }
  }

  async loadCommentsFromBackend(grievanceId?: string): Promise<void> {
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
      return list.filter(g =>
        !!g.assignedOfficerId && (
          g.assignedOfficerId === user.uid ||
          g.assignedOfficerName === user.displayName ||
          g.assignedOfficerId === user.email
        )
      );
    } else {
      // Citizen
      return list.filter(g => g.citizenId === user.uid || g.citizenEmail === user.email);
    }
  });

  getGrievanceById(id: string): Grievance | undefined {
    return this.grievances().find(g => g.id === id || g.trackingCode === id);
  }

  getCommentsForGrievance(grievanceId: string): GrievanceComment[] {
    const userRole = this.authService.userRole();
    return this.comments().filter(c => {
      if (c.grievanceId !== grievanceId) return false;
      if (userRole === 'citizen' && c.isInternalOnly) return false;
      return true;
    });
  }

  /**
   * Submit Grievance (Citizen)
   */
  async submitGrievance(data: Omit<Grievance, 'id' | 'trackingCode' | 'status' | 'createdAt' | 'updatedAt' | 'isEscalated'>): Promise<Grievance> {
    const res = await firstValueFrom(this.http.post<{ success: boolean; grievance: Grievance }>(`${this.apiUrl}/grievances`, data));
    if (!res || !res.success) {
      throw new Error('Failed to submit grievance to backend server.');
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
   * Add Comment (Officer / Admin / Citizen)
   */
  async addComment(grievanceId: string, commentText: string, isInternalOnly: boolean = false): Promise<void> {
    await firstValueFrom(this.http.post(`${this.apiUrl}/comments`, {
      grievanceId,
      commentText,
      isInternalOnly
    }));
    await this.loadCommentsFromBackend(grievanceId);
  }

  /**
   * Reopen Grievance (Citizen)
   */
  async reopenGrievance(grievanceId: string, reason: string): Promise<void> {
    await this.updateStatus(grievanceId, 'reopened');
    await this.addComment(grievanceId, `[REOPENED TICKET]: ${reason}`, false);
  }

  /**
   * Submit Feedback / Rating (Citizen)
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
}
