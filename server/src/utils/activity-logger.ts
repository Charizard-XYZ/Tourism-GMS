import { db } from '../config/firebase-admin';

export async function logActivity(
  userId: string,
  userName: string,
  userRole: string,
  action: string,
  targetModule: string,
  targetId: string,
  details: string
): Promise<void> {
  try {
    const docRef = db.collection('activityLogs').doc();
    await docRef.set({
      id: docRef.id,
      userId: userId || 'SYSTEM',
      userName: userName || 'System',
      userRole: userRole || 'system',
      action,
      module: targetModule,
      targetId,
      details,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.warn('Activity logging warning (non-fatal):', error);
  }
}
