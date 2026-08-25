export type UserRole = 'citizen' | 'officer' | 'admin';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  departmentId?: string;
  departmentName?: string;
  phoneNumber?: string;
  designation?: string;
  createdAt: string;
  isActive: boolean;
}

export interface RegisteredOfficer {
  id: string;
  name: string;
  email: string;
  password?: string;
  designation: string;
  departmentId: string;
  departmentName: string;
  phone?: string;
  createdAt: string;
  isRevoked?: boolean;
}
