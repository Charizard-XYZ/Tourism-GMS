import { Request, Response, NextFunction } from 'express';
import { adminAuth, db } from '../config/firebase-admin';

export interface AuthenticatedUser {
  uid: string;
  userCode?: string;
  email: string;
  role: 'admin' | 'officer' | 'tourist';
  displayName?: string;
  departmentId?: string;
  departmentName?: string;
  designation?: string;
  phoneNumber?: string;
  isActive?: boolean;
  isRevoked?: boolean;
  createdAt?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

let hasLoggedProjectInfo = false;

export async function authenticateFirebaseToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  // Diagnostic: log every authenticated request attempt
  console.log(`[AUTH DIAG] ${req.method} ${req.originalUrl} | Auth Header: ${authHeader ? 'PRESENT (length=' + authHeader.length + ')' : 'MISSING'}`);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn(`[AUTH 401-A] No Bearer token. Header value: ${authHeader ? '"' + authHeader.substring(0, 20) + '..."' : 'undefined'}`);
    res.status(401).json({
      success: false,
      message: 'Authentication required. Missing or malformed Authorization header.'
    });
    return;
  }

  const token = authHeader.split('Bearer ')[1]?.trim();

  if (!token) {
    console.warn(`[AUTH 401-B] Token is empty after split.`);
    res.status(401).json({
      success: false,
      message: 'Authentication required. Missing Firebase ID Token.'
    });
    return;
  }

  try {
    // 1. Verify Firebase ID Token using Firebase Admin SDK
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;
    const email = (decodedToken.email || '').toLowerCase().trim();

    // One-time project diagnostic log
    if (!hasLoggedProjectInfo) {
      hasLoggedProjectInfo = true;
      console.log(`[AUTH DIAG] Firebase Admin project: ${(adminAuth.app as any)?.options?.projectId || 'unknown'}`);
      console.log(`[AUTH DIAG] Token verification: SUCCESS`);
    }

    // 2. Query Firestore Document using Firebase UID: users/{uid}
    let userData: Record<string, any> = {};
    let docExists = false;
    let lookupMethod = 'none';

    try {
      // Primary: Direct document lookup by UID path: users/{uid}
      const docPath = `users/${uid}`;
      const userDoc = await db.collection('users').doc(uid).get();
      docExists = userDoc.exists;

      if (docExists) {
        userData = userDoc.data() || {};
        lookupMethod = 'direct-doc-id';
      } else {
        // Secondary: Query by uid field (handles case where doc ID differs from uid field)
        console.log(`[AUTH DIAG] Direct doc ${docPath} NOT FOUND. Trying field queries...`);
        const uidQuery = await db.collection('users').where('uid', '==', uid).limit(1).get();
        if (!uidQuery.empty) {
          docExists = true;
          userData = uidQuery.docs[0].data() || {};
          lookupMethod = `uid-field-query (actual doc ID: ${uidQuery.docs[0].id})`;
        } else if (email) {
          const emailQuery = await db.collection('users').where('email', '==', email).limit(1).get();
          if (!emailQuery.empty) {
            docExists = true;
            userData = emailQuery.docs[0].data() || {};
            lookupMethod = `email-field-query (actual doc ID: ${emailQuery.docs[0].id})`;
          }
        }
      }

      // Safe diagnostic log (never log tokens/passwords/keys)
      console.log(`[AUTH DIAG] UID: ${uid} | Lookup: ${lookupMethod} | Exists: ${docExists} | Role: ${userData['role'] || '(empty)'} | Name: ${userData['fullName'] || '(empty)'}`);
    } catch (dbErr: any) {
      console.error(`[AUTH ERROR] Firestore query FAILED for UID ${uid}: ${dbErr?.code || ''} ${dbErr?.message || dbErr}`);
      // Firestore query threw an error — do NOT silently continue with empty data
      // Return 503 so the client knows it's a server-side issue, not an auth issue
      res.status(503).json({
        success: false,
        message: 'Database temporarily unavailable. Please try again.'
      });
      return;
    }

    // Handle: document not found
    if (!docExists) {
      // Special case: registration endpoints need to pass through because
      // the document doesn't exist YET — it will be created by the route handler
      const isRegistration = (req.originalUrl || req.path || '').includes('/register-tourist');
      if (isRegistration) {
        req.user = {
          uid,
          email,
          role: 'tourist',
          displayName: decodedToken.name || '',
          phoneNumber: '',
          isActive: true,
          createdAt: new Date().toISOString()
        };
        next();
        return;
      }

      // Non-registration endpoint: no profile exists
      console.warn(`[AUTH WARN] No Firestore profile found for UID ${uid} on path ${req.originalUrl}`);
      res.status(404).json({
        success: false,
        message: 'User profile not found. Please register first.'
      });
      return;
    }

    // Handle: deactivated account
    if (userData['isActive'] === false) {
      res.status(403).json({
        success: false,
        message: 'Account access has been deactivated.'
      });
      return;
    }

    // Read role from Firestore document — NO default tourist fallback
    const rawRole = userData['role'];
    if (!rawRole || typeof rawRole !== 'string') {
      console.error(`[AUTH ERROR] User ${uid} has invalid/missing role field: ${rawRole}`);
      res.status(400).json({
        success: false,
        message: 'User profile has an invalid or missing role.'
      });
      return;
    }

    const normalizedRole = rawRole.trim().toLowerCase() as 'admin' | 'officer' | 'tourist';
    if (!['admin', 'officer', 'tourist'].includes(normalizedRole)) {
      console.error(`[AUTH ERROR] User ${uid} has unrecognized role: ${normalizedRole}`);
      res.status(400).json({
        success: false,
        message: `Unrecognized user role: "${normalizedRole}".`
      });
      return;
    }

    // Reject revoked accounts immediately
    if (userData['isRevoked'] === true) {
      res.status(403).json({
        success: false,
        message: 'Account access has been revoked.'
      });
      return;
    }

    // Build authenticated user from Firestore data — NO email.split('@') for displayName
    req.user = {
      uid: userData['uid'] || uid,
      userCode: userData['userCode'] || '',
      email: userData['email'] || email,
      role: normalizedRole,
      displayName: userData['fullName'] || userData['displayName'] || decodedToken.name || '',
      departmentId: userData['departmentId'] || '',
      departmentName: userData['departmentName'] || '',
      designation: userData['designation'] || '',
      phoneNumber: userData['phoneNumber'] || userData['phone'] || '',
      isActive: userData['isActive'] !== false,
      isRevoked: userData['isRevoked'] === true,
      createdAt: userData['createdAt'] || ''
    };

    next();
  } catch (error: any) {
    console.error(`[AUTH 401-C] verifyIdToken FAILED: code=${error.code || 'none'} message=${error.message || error}`);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token.'
    });
  }
}
