import { UserRole } from './user.model';
import { GrievanceAttachment } from './complaint.model';

export interface GrievanceComment {
  id: string;
  grievanceId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  commentText: string;
  isInternalOnly: boolean; // True for internal officer/admin notes, false for public updates visible to tourist
  attachments?: GrievanceAttachment[];
  createdAt: string;
}
