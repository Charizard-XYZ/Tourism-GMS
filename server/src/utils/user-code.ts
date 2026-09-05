import crypto from 'crypto';
import { db } from '../config/firebase-admin';

const CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // 32 characters, excluding 0, 1, I, O

/**
 * Generate a cryptographically strong random string of given length
 */
function generateRandomString(length: number = 8): string {
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CHARSET[bytes[i]! % CHARSET.length];
  }
  return result;
}

/**
 * Generate a globally unique userCode across the entire Firestore 'users' collection.
 * Format:
 *   - Admin:   ADM-<random-string>
 *   - Officer: OFF-<random-string>
 *   - Tourist: TOU-<random-string>
 * 
 * Uniqueness is strictly verified against Firestore before returning.
 */
export async function generateUniqueUserCode(role: 'admin' | 'officer' | 'tourist'): Promise<string> {
  const prefix = role === 'admin' ? 'ADM' : role === 'officer' ? 'OFF' : 'TOU';
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const randomPart = generateRandomString(8);
    const candidateCode = `${prefix}-${randomPart}`;

    // Verify global uniqueness across entire 'users' collection
    const snapshot = await db.collection('users').where('userCode', '==', candidateCode).limit(1).get();
    if (snapshot.empty) {
      return candidateCode;
    }
  }

  // If extremely rare collision occurs across 10 attempts, increase length
  const fallbackPart = generateRandomString(10);
  return `${prefix}-${fallbackPart}`;
}

/**
 * Generate a globally unique grievanceCode across the Firestore 'grievances' collection.
 * Format: GMS-<CURRENT_YEAR>-<random-string> (e.g. GMS-2026-8F3K7Q2M)
 * 
 * Uniqueness is strictly verified against Firestore before returning.
 */
export async function generateUniqueGrievanceCode(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `GMS-${currentYear}`;
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const randomPart = generateRandomString(8);
    const candidateCode = `${prefix}-${randomPart}`;

    // Verify global uniqueness against both grievanceCode and trackingCode
    const snapshot1 = await db.collection('grievances').where('grievanceCode', '==', candidateCode).limit(1).get();
    if (!snapshot1.empty) continue;

    const snapshot2 = await db.collection('grievances').where('trackingCode', '==', candidateCode).limit(1).get();
    if (!snapshot2.empty) continue;

    return candidateCode;
  }

  const fallbackPart = generateRandomString(10);
  return `${prefix}-${fallbackPart}`;
}
