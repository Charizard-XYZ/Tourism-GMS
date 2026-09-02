import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { FirebaseService } from '../services/firebase.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const firebaseService = inject(FirebaseService);

  // Only intercept requests to our backend API
  if (!req.url.includes('/api/')) {
    return next(req);
  }

  // If request already has Authorization header, pass through
  if (req.headers.has('Authorization')) {
    return next(req);
  }

  return from(
    (async () => {
      try {
        if (firebaseService.auth.authStateReady) {
          await firebaseService.auth.authStateReady();
        }
        const user = firebaseService.auth.currentUser;
        if (user) {
          const token = await user.getIdToken(false);
          console.log(`[INTERCEPTOR] ${req.method} ${req.url} | currentUser: YES (uid=${user.uid.substring(0, 8)}...) | Token: ${token ? 'OK (length=' + token.length + ')' : 'NULL'}`);
          return token;
        } else {
          console.warn(`[INTERCEPTOR] ${req.method} ${req.url} | currentUser: NULL — request will go WITHOUT Authorization header`);
        }
      } catch (e: any) {
        console.warn(`[INTERCEPTOR] ${req.method} ${req.url} | ERROR getting token: ${e.message || e}`);
      }
      return null;
    })()
  ).pipe(
    switchMap(token => {
      if (token) {
        const authReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
        return next(authReq);
      }
      return next(req);
    })
    // DO NOT add catchError here — it was catching HTTP response errors (like 503)
    // and retrying the request WITHOUT the token, causing phantom 401 errors.
    // Token-getting errors are already handled inside the async function above.
  );
};
