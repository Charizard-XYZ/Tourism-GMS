import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { GrievanceService } from '../../core/services/grievance.service';
import { ToastComponent } from '../components/toast.component';
import { formatPhoneNumber, isPhoneTextInvalid } from '../../core/models/user.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, ToastComponent],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {
  authService = inject(AuthService);
  grievanceService = inject(GrievanceService);
  router = inject(Router);

  isProfileOpen = signal<boolean>(false);
  isMobileMenuOpen = signal<boolean>(false);
  isEditProfileOpen = signal<boolean>(false);
  hasSubmitted = signal<boolean>(false);
  toastMessage = signal<string | null>(null);

  editForm = {
    name: '',
    email: '',
    phone: ''
  };

  getHomeRoute(): string {
    if (this.authService.isAuthenticated()) {
      return '/home/hero-section';
    }
    return '/';
  }

  getProfileRoute(): string {
    if (this.authService.isTourist()) return '/tourist/profile';
    if (this.authService.isOfficer()) return '/officer/profile';
    if (this.authService.isAdmin()) return '/admin/profile';
    return '/';
  }

  toggleProfile() {
    this.isProfileOpen.update(v => !v);
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen.update(v => !v);
  }



  async logout() {
    this.isProfileOpen.set(false);
    this.isMobileMenuOpen.set(false);
    await this.authService.logout();
    this.grievanceService.clearState();
    this.router.navigate(['/'], { replaceUrl: true });
  }
}
