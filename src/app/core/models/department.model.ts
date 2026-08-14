export interface DepartmentOfficer {
  id: string;
  name: string;
  email: string;
  designation?: string;
  phone?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  headOfficerId?: string;
  headOfficerName?: string;
  contactEmail: string;
  contactPhone: string;
  isActive: boolean;
  officerCount: number;
  activeComplaintsCount: number;
  assignedOfficers?: DepartmentOfficer[];
  createdAt: string;
}
