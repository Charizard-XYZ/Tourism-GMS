import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastComponent } from '../components/toast.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, ToastComponent],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {
  authService = inject(AuthService);
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

  toggleProfile() {
    this.isProfileOpen.update(v => !v);
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen.update(v => !v);
  }

  openEditProfileModal() {
    if (!this.authService.isCitizen()) return;
    const cur = this.authService.currentUser();
    if (cur) {
      this.editForm = {
        name: cur.displayName || '',
        email: cur.email || '',
        phone: cur.phoneNumber || ''
      };
    }
    this.hasSubmitted.set(false);
    this.isEditProfileOpen.set(true);
    this.isProfileOpen.set(false);
  }

  onPhoneChange(val: string) {
    this.editForm.phone = val;
  }

  isNameNumericInvalid(val: string): boolean {
    if (!val.trim()) return false;
    return /\d/.test(val);
  }

  isEmailValid(val: string): boolean {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val.trim());
  }

  isPhoneTextInvalid(val: string): boolean {
    if (!val.trim()) return false;
    const clean = val.replace(/[\s+-]/g, '');
    return !/^\d+$/.test(clean) || clean.length !== 10;
  }

  saveProfile() {
    this.hasSubmitted.set(true);

    if (!this.editForm.name.trim() || !this.editForm.email.trim() || !this.editForm.phone.trim()) {
      this.toastMessage.set('Please fill out all required fields.');
      return;
    }

    if (this.isNameNumericInvalid(this.editForm.name)) {
      this.toastMessage.set('Names can not be in number');
      return;
    }

    if (this.isPhoneTextInvalid(this.editForm.phone)) {
      this.toastMessage.set('Enter phone number');
      return;
    }

    if (!this.isEmailValid(this.editForm.email)) {
      this.toastMessage.set('Invalid email format. Must be in format: username@gmail.com');
      return;
    }

    try {
      this.authService.updateUserProfile(this.editForm.name, this.editForm.email, this.editForm.phone);
      this.isEditProfileOpen.set(false);
      this.toastMessage.set('Profile details updated successfully!');
    } catch (err: any) {
      this.toastMessage.set(err.message || 'Failed to update profile.');
    }
  }

  logout() {
    this.authService.logout();
    this.isProfileOpen.set(false);
    this.router.navigate(['/']);
  }
}
