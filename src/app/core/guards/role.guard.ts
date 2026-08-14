import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

export const roleGuard = (allowedRoles: UserRole[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      router.navigate(['/auth/login']);
      return false;
    }

    const role = authService.userRole();
    if (allowedRoles.includes(role)) {
      return true;
    }

    // Redirect to login if unauthorized role
    router.navigate(['/auth/login']);
    return false;
  };
};

export const adminGuard: CanActivateFn = roleGuard(['admin']);
export const officerGuard: CanActivateFn = roleGuard(['officer', 'admin']);
export const citizenGuard: CanActivateFn = roleGuard(['citizen', 'admin']);
