import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

export const roleGuard = (allowedRoles: UserRole[]): CanActivateFn => {
  return async () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    await authService.ensureInitialized();

    if (!authService.isAuthenticated()) {
      router.navigate(['/auth/login']);
      return false;
    }

    const user = authService.currentUser();
    if (user?.isRevoked) {
      await authService.logout();
      router.navigate(['/auth/login']);
      return false;
    }

    const role = authService.userRole();
    if (role && allowedRoles.includes(role)) {
      return true;
    }

    // Redirect to login if unauthorized role
    router.navigate(['/auth/login']);
    return false;
  };
};

export const adminGuard: CanActivateFn = roleGuard(['admin']);
export const officerGuard: CanActivateFn = roleGuard(['officer', 'admin']);
export const touristGuard: CanActivateFn = roleGuard(['tourist', 'admin']);

export const guestGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.ensureInitialized();

  if (authService.isAuthenticated()) {
    router.navigate(['/home/hero-section'], { replaceUrl: true });
    return false;
  }
  return true;
};
