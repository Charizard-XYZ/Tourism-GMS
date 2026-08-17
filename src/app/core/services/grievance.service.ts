import { Injectable, signal, computed, inject } from '@angular/core';
import { Grievance, GrievanceCategory, GrievanceStatus } from '../models/complaint.model';
import { GrievanceComment } from '../models/comment.model';
import { Feedback } from '../models/feedback.model';
import { AuthService } from './auth.service';
import { AuditLogService } from './audit-log.service';

@Injectable({
  providedIn: 'root'
})
export class GrievanceService {
  private authService = inject(AuthService);
  private auditLogService = inject(AuditLogService);

  private initialGrievances: Grievance[] = [];
  private initialComments: GrievanceComment[] = [];

  readonly grievances = signal<Grievance[]>(this.initialGrievances);
  readonly comments = signal<GrievanceComment[]>(this.initialComments);
  readonly feedbacks = signal<Feedback[]>([]);

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
      // Hide internal notes from citizens
      if (userRole === 'citizen' && c.isInternalOnly) return false;
      return true;
    });
  }

  /**
   * Submit a new grievance (Citizen)
   */
  submitGrievance(data: Omit<Grievance, 'id' | 'trackingCode' | 'status' | 'createdAt' | 'updatedAt' | 'isEscalated'>): Grievance {
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const trackingCode = `GMS-2026-${randomCode}`;

    const newGrievance: Grievance = {
      ...data,
      id: `g-${Date.now().toString().slice(-4)}`,
      trackingCode,
      status: 'submitted',
      isEscalated: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.grievances.update(list => [newGrievance, ...list]);

    // Send Activity Log
    this.auditLogService.log(
      data.citizenId,
      data.citizenName,
      'citizen',
      'SUBMIT_GRIEVANCE',
      'Grievances',
      newGrievance.id,
      `Submitted grievance ${trackingCode}: ${newGrievance.title}`
    );

    return newGrievance;
  }

  /**
   * Assign Grievance to Department & Officer (Admin)
   */
  assignGrievance(grievanceId: string, departmentId: string, departmentName: string, officerId: string, officerName: string): void {
    this.grievances.update(list =>
      list.map(g => {
        if (g.id === grievanceId || g.trackingCode === grievanceId) {
          const updated: Grievance = {
            ...g,
            departmentId,
            departmentName,
            assignedOfficerId: officerId,
            assignedOfficerName: officerName,
            status: 'assigned',
            updatedAt: new Date().toISOString()
          };

          const currentUser = this.authService.currentUser();
          if (currentUser) {
            this.auditLogService.log(
              currentUser.uid,
              currentUser.displayName,
              currentUser.role,
              'ASSIGN_GRIEVANCE',
              'Grievances',
              g.id,
              `Assigned grievance ${g.trackingCode} to ${departmentName} (${officerName})`
            );
          }

          return updated;
        }
        return g;
      })
    );
  }

  /**
   * Update Status (Officer / Admin)
   */
  updateStatus(grievanceId: string, newStatus: GrievanceStatus, resolutionDetails?: string, resolutionFiles?: any[]): void {
    this.grievances.update(list =>
      list.map(g => {
        if (g.id === grievanceId || g.trackingCode === grievanceId) {
          const updated: Grievance = {
            ...g,
            status: newStatus,
            resolutionDetails: resolutionDetails || g.resolutionDetails,
            resolutionAttachments: resolutionFiles || g.resolutionAttachments,
            resolvedAt: newStatus === 'resolved' ? new Date().toISOString() : g.resolvedAt,
            updatedAt: new Date().toISOString()
          };

          const currentUser = this.authService.currentUser();
          if (currentUser) {
            this.auditLogService.log(
              currentUser.uid,
              currentUser.displayName,
              currentUser.role,
              'UPDATE_STATUS',
              'Grievances',
              g.id,
              `Status updated to ${newStatus.toUpperCase()} for ${g.trackingCode}`
            );
          }

          return updated;
        }
        return g;
      })
    );
  }

  /**
   * Add Comment (Officer / Admin / Citizen)
   */
  addComment(grievanceId: string, commentText: string, isInternalOnly: boolean = false): void {
    const user = this.authService.currentUser();
    if (!user) return;

    const newComment: GrievanceComment = {
      id: `comm-${Date.now().toString().slice(-4)}`,
      grievanceId,
      userId: user.uid,
      userName: user.displayName,
      userRole: user.role,
      commentText,
      isInternalOnly,
      createdAt: new Date().toISOString()
    };

    this.comments.update(list => [...list, newComment]);

    this.auditLogService.log(
      user.uid,
      user.displayName,
      user.role,
      'ADD_COMMENT',
      'Comments',
      grievanceId,
      `Posted ${isInternalOnly ? 'internal note' : 'public comment'} on grievance ${grievanceId}`
    );
  }

  /**
   * Reopen Grievance (Citizen)
   */
  reopenGrievance(grievanceId: string, reason: string): void {
    const user = this.authService.currentUser();

    this.grievances.update(list =>
      list.map(g => {
        if (g.id === grievanceId || g.trackingCode === grievanceId) {
          return {
            ...g,
            status: 'reopened',
            isEscalated: true,
            updatedAt: new Date().toISOString()
          };
        }
        return g;
      })
    );

    if (user) {
      this.addComment(grievanceId, `[REOPENED TICKET]: ${reason}`, false);
      this.auditLogService.log(
        user.uid,
        user.displayName,
        user.role,
        'REOPEN_GRIEVANCE',
        'Grievances',
        grievanceId,
        `Reopened grievance ticket ${grievanceId}. Reason: ${reason}`
      );
    }
  }

  /**
   * Submit Feedback / Rating (Citizen)
   */
  submitFeedback(grievanceId: string, rating: number, comments: string, autoClose: boolean = true): void {
    const user = this.authService.currentUser();

    this.grievances.update(list =>
      list.map(g => {
        if (g.id === grievanceId || g.trackingCode === grievanceId) {
          return {
            ...g,
            rating,
            feedbackComments: comments,
            status: autoClose ? 'closed' : g.status,
            updatedAt: new Date().toISOString()
          };
        }
        return g;
      })
    );

    if (user) {
      const newFeedback: Feedback = {
        id: `fb-${Date.now().toString().slice(-4)}`,
        grievanceId,
        citizenId: user.uid,
        citizenName: user.displayName,
        rating,
        comments,
        resolutionSatisfactory: rating >= 4,
        createdAt: new Date().toISOString()
      };
      this.feedbacks.update(list => [...list, newFeedback]);

      this.auditLogService.log(
        user.uid,
        user.displayName,
        user.role,
        'SUBMIT_FEEDBACK',
        'Feedback',
        grievanceId,
        `Rated resolution ${rating}/5 stars for ticket ${grievanceId}`
      );
    }
  }
}
