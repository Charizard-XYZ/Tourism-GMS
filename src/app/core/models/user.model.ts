export type UserRole = 'citizen' | 'officer' | 'admin';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  password?: string;
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
  } else if (clean.startsWith('0') && clean.length === 11) {
    tenDigits = clean.slice(1);
  } else if (clean.length > 10) {
    tenDigits = clean.slice(-10);
  }
  if (tenDigits.length === 10) {
    return `+91 ${tenDigits.slice(0, 5)} ${tenDigits.slice(5)}`;
  }
  return val.trim();
}

export function isPhoneTextInvalid(val: string): boolean {
  if (!val || !val.trim()) return false;
  const digitsOnly = val.replace(/\D/g, '');
  if (digitsOnly.startsWith('91') && digitsOnly.length === 12) {
    return false;
  }
  if (digitsOnly.startsWith('0') && digitsOnly.length === 11) {
    return false;
  }
  if (digitsOnly.length === 10) {
    return false;
  }
  return true;
}
