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

export function formatPhoneNumber(val: string): string {
  if (!val) return '';
  const clean = val.replace(/\D/g, '');
  let tenDigits = clean;
  if (clean.startsWith('91') && clean.length === 12) {
    tenDigits = clean.slice(2);
  } else if (clean.length > 10) {
    tenDigits = clean.slice(-10);
  }
  if (tenDigits.length === 10) {
    return `+91 ${tenDigits.slice(0, 5)} ${tenDigits.slice(5)}`;
  }
  return val.trim();
}
