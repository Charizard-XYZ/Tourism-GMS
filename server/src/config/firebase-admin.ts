import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

function initFirebaseAdmin(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  const projectId = process.env['FIREBASE_PROJECT_ID'] || 'tourism-gms';

  // Option 1: Inline Service Account JSON string from environment variable
  const serviceAccountJson = process.env['FIREBASE_SERVICE_ACCOUNT_JSON'];
  if (serviceAccountJson) {
    try {
      const credentials = JSON.parse(serviceAccountJson);
      console.log(`Firebase Admin SDK initialized via FIREBASE_SERVICE_ACCOUNT_JSON | project: ${projectId}`);
      return initializeApp({
        credential: cert(credentials),
        projectId
      });
    } catch (e) {
      console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', e);
    }
  }

  // Option 2: Path to service account JSON file from environment variable
  const serviceAccountPath = process.env['FIREBASE_SERVICE_ACCOUNT_PATH'];
  if (serviceAccountPath) {
    const resolvedPath = path.resolve(serviceAccountPath);
    if (fs.existsSync(resolvedPath)) {
      const credentials = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
      console.log(`Firebase Admin SDK initialized via FIREBASE_SERVICE_ACCOUNT_PATH | project: ${projectId} | file: ${resolvedPath}`);
      return initializeApp({
        credential: cert(credentials),
        projectId
      });
    } else {
      console.warn(`FIREBASE_SERVICE_ACCOUNT_PATH="${serviceAccountPath}" but file NOT FOUND at ${resolvedPath}`);
    }
  }

  // Option 3: Auto-detect service account JSON in server/src/config/ directory
  const configDir = path.resolve('server/src/config');
  if (fs.existsSync(configDir)) {
    try {
      const files = fs.readdirSync(configDir);
      const saFile = files.find(f => f.endsWith('.json') && (f.includes('firebase-adminsdk') || f.includes('serviceAccount') || f.includes('service-account')));
      if (saFile) {
        const saPath = path.join(configDir, saFile);
        const credentials = JSON.parse(fs.readFileSync(saPath, 'utf8'));
        if (credentials.type === 'service_account' && credentials.project_id) {
          console.log(`Firebase Admin SDK initialized via auto-detected key | project: ${credentials.project_id} | file: ${saPath}`);
          return initializeApp({
            credential: cert(credentials),
            projectId: credentials.project_id
          });
        }
      }
    } catch (e) {
      console.warn('Auto-detection of service account failed:', e);
    }
  }

  // Option 4: No credentials — token verification works but Firestore will FAIL
  console.warn(`=============================================================`);
  console.warn(`WARNING: No Firebase service account credentials found.`);
  console.warn(`Token verification will work, but Firestore reads will FAIL.`);
  console.warn(`Place your service account JSON in server/src/config/`);
  console.warn(`or set FIREBASE_SERVICE_ACCOUNT_PATH in .env`);
  console.warn(`=============================================================`);
  console.log(`Firebase Admin SDK initialized WITHOUT credentials | project: ${projectId}`);
  return initializeApp({
    projectId
  });
}

export const adminApp = initFirebaseAdmin();
export const adminAuth = getAuth(adminApp);
export const db = getFirestore(adminApp);
