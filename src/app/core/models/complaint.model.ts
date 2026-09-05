export type GrievanceCategory = string;

export type GrievanceStatus = 
  | 'submitted'
  | 'under_review'
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'reopened'
  | 'closed'
  | 'cancelled';

export interface GrievanceAttachment {
  name: string;
  url: string;
  size?: string;
  type?: string;
}

export interface Grievance {
  id: string;
  trackingCode: string;
  grievanceCode?: string;
  title: string;
  description: string;
  category: GrievanceCategory;
  departmentCode?: string;
  originalDepartmentName?: string;
  originalDepartmentCode?: string;
  departmentDeleted?: boolean;
  subCategory?: string;
  location: string;
  touristLocationName?: string;
  status: GrievanceStatus;
  
  touristId?: string;
  touristName?: string;
  touristEmail?: string;
  touristPhone?: string;
  departmentId?: string;
  departmentName?: string;

  assignedOfficerId?: string;
  assignedOfficerName?: string;

  attachments?: GrievanceAttachment[];

  resolutionDetails?: string;
  resolutionAttachments?: GrievanceAttachment[];
  resolvedAt?: string;

  rating?: number;
  feedbackComments?: string;
  feedbackSubmittedAt?: string;

  isEscalated: boolean;
  escalationReason?: string;

  createdAt: string;
  updatedAt: string;
}
