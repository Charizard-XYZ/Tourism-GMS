import { Injectable, signal, computed, inject } from '@angular/core';
import { Grievance, GrievanceCategory, GrievanceStatus } from '../models/complaint.model';
import { GrievanceComment } from '../models/comment.model';
import { Feedback } from '../models/feedback.model';
import { AuthService } from './auth.service';
import { AuditLogService } from './audit-log.service';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: 'root'
})
export class GrievanceService {
  private authService = inject(AuthService);
  private auditLogService = inject(AuditLogService);
  private firebaseService = inject(FirebaseService);

  private initialGrievances: Grievance[] = [
    {
      id: 'g-1001',
      trackingCode: 'GMS-2026-8492',
      title: 'Overcharging prepaid taxi fare at Ridge Shimla',
      description: 'Taxi operator demanded double rate beyond approved Directorate prepaid fare chart.',
      category: 'Transport & Mobility Cell',
      departmentId: 'dept-01',
      departmentName: 'Transport & Mobility Cell',
      assignedOfficerId: 'OFF-847291',
      assignedOfficerName: 'Ramesh Chand',
      status: 'in_progress',
      isEscalated: false,
      citizenId: 'cit-001',
      citizenName: 'Amit Kapoor',
      citizenEmail: 'amit.kapoor@gmail.com',
      citizenPhone: '+91 98765 43210',
      location: 'Shimla Ridge Prepaid Stand',
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'g-1002',
      trackingCode: 'GMS-2026-9184',
      title: 'Sanitation & Tariff Dispute at Mall Road Hotel',
      description: 'Hotel management refused room refund and levied undisclosed surcharge upon checkout.',
      category: 'Hospitality & Hotel Standards',
      departmentId: 'dept-02',
      departmentName: 'Hospitality & Hotel Standards',
      assignedOfficerId: 'OFF-912834',
      assignedOfficerName: 'Sunil Kumar',
      status: 'assigned',
      isEscalated: false,
      citizenId: 'cit-002',
      citizenName: 'Neha Sharma',
      citizenEmail: 'neha.sharma@gmail.com',
      citizenPhone: '+91 98160 54321',
      location: 'Mall Road Manali',
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  private initialComments: GrievanceComment[] = [];

  readonly grievances = signal<Grievance[]>(this.initialGrievances);
  readonly comments = signal<GrievanceComment[]>(this.initialComments);
  readonly feedbacks = signal<Feedback[]>([]);

  constructor() {
    this.restoreFromStorage();
    this.syncFromBackend();
  }

  private restoreFromStorage(): void {
    try {
      const savedGrievances = localStorage.getItem('gms_grievances');
      if (savedGrievances) {
        this.grievances.set(JSON.parse(savedGrievances));
      }
      const savedComments = localStorage.getItem('gms_comments');
      if (savedComments) {
        this.comments.set(JSON.parse(savedComments));
      }
      const savedFeedbacks = localStorage.getItem('gms_feedbacks');
      if (savedFeedbacks) {
        this.feedbacks.set(JSON.parse(savedFeedbacks));
      }
    } catch (err) {
      console.warn('Failed to restore grievances from localStorage:', err);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('gms_grievances', JSON.stringify(this.grievances()));
      localStorage.setItem('gms_comments', JSON.stringify(this.comments()));
      localStorage.setItem('gms_feedbacks', JSON.stringify(this.feedbacks()));
    } catch (err) {
      console.warn('Failed to save grievances to localStorage:', err);
    }
  }

  async syncFromBackend() {
    const remote = await this.firebaseService.fetchApi<Grievance[]>('/grievances');
    if (remote && Array.isArray(remote)) {
      this.grievances.set(remote);
      this.saveToStorage();
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
      // Hide internal notes from citizens
      if (userRole === 'citizen' && c.isInternalOnly) return false;
      return true;
    });
  }

  /**
   * Submit a new grievance (Citizen) with automated load-balancing officer assignment
   */
  submitGrievance(data: Omit<Grievance, 'id' | 'trackingCode' | 'status' | 'createdAt' | 'updatedAt' | 'isEscalated'>): Grievance {
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const trackingCode = `GMS-2026-${randomCode}`;

    const targetDeptId = data.departmentId;
    const targetDeptName = data.departmentName;

    // Find active non-revoked officers assigned to this target department
    const allOfficers = this.authService.registeredOfficers().filter(o => !o.isRevoked);
    const deptOfficers = allOfficers.filter(o => 
      (targetDeptId && o.departmentId === targetDeptId) || 
      (targetDeptName && o.departmentName?.toLowerCase() === targetDeptName.toLowerCase())
    );

    let assignedOfficerId = data.assignedOfficerId || '';
    let assignedOfficerName = data.assignedOfficerName || '';
    let initialStatus: GrievanceStatus = 'submitted';

    if (deptOfficers.length > 0) {
      const existingGrievances = this.grievances();
      
      // Calculate active complaint count for each candidate officer in target department
      const officersWithCounts = deptOfficers.map(off => {
        const count = existingGrievances.filter(g => 
          g.assignedOfficerId === off.id || 
          g.assignedOfficerId === off.email ||
          g.assignedOfficerName === off.name
        ).length;
        return { officer: off, count };
      });

      // Find the minimum grievance count
      const minCount = Math.min(...officersWithCounts.map(o => o.count));

      // Filter all officers who share the minimum count
      const leastLoaded = officersWithCounts.filter(o => o.count === minCount);

      // Pick randomly if 2 or more officers have equal minimum complaints
      const selectedObj = leastLoaded[Math.floor(Math.random() * leastLoaded.length)];
      const assignedOfficer = selectedObj.officer;

      assignedOfficerId = assignedOfficer.id;
      assignedOfficerName = assignedOfficer.name;
      initialStatus = 'assigned';
    }

    const newGrievance: Grievance = {
      ...data,
      id: `g-${Date.now().toString().slice(-4)}`,
      trackingCode,
      departmentId: targetDeptId,
      departmentName: targetDeptName,
      assignedOfficerId,
      assignedOfficerName,
      status: initialStatus,
      isEscalated: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.grievances.update(list => [newGrievance, ...list]);
    this.saveToStorage();

    // Push to Firebase REST API
    this.firebaseService.fetchApi<Grievance>('/grievances', {
      method: 'POST',
      body: JSON.stringify(newGrievance)
    });

    // Send Activity Log
    this.auditLogService.log(
      data.citizenId,
      data.citizenName,
      'citizen',
      'SUBMIT_GRIEVANCE',
      'Grievances',
      newGrievance.id,
      `Submitted grievance ${trackingCode} auto-assigned to ${assignedOfficerName || 'Unassigned'}`
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

          // Sync to Firebase API
          this.firebaseService.fetchApi<Grievance>(`/grievances/${g.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              departmentId,
              departmentName,
              assignedOfficerId: officerId,
              assignedOfficerName: officerName,
              status: 'assigned'
            })
          });

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

          // Sync to Firebase API
          this.firebaseService.fetchApi<Grievance>(`/grievances/${g.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              status: newStatus,
              resolutionDetails: updated.resolutionDetails,
              resolutionAttachments: updated.resolutionAttachments,
              resolvedAt: updated.resolvedAt
            })
          });

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

    // Push to Firebase API
    this.firebaseService.fetchApi<GrievanceComment>('/comments', {
      method: 'POST',
      body: JSON.stringify(newComment)
    });

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
