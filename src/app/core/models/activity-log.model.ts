import { UserRole } from './user.model';

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string; // e.g. 'SUBMIT_GRIEVANCE', 'ASSIGN_OFFICER', 'UPDATE_STATUS', 'CREATE_DEPARTMENT'
  targetCollection: string;
  targetId: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
}
