import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/user.model';
import { ToastComponent } from '../../common/components/toast.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ToastComponent],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  authService = inject(AuthService);
  router = inject(Router);

  selectedRole = signal<UserRole>('tourist');
  email = '';
  password = '';
  showPassword = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  hasSubmitted = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  toastMessage = signal<string | null>(null);

  isForgotPasswordOpen = signal<boolean>(false);
  resetEmail = '';
  hasResetSubmitted = signal<boolean>(false);
  resetError = signal<string | null>(null);
  resetSuccess = signal<string | null>(null);

  setRole(role: UserRole) {
    this.selectedRole.set(role);
    this.hasSubmitted.set(false);
    this.errorMessage.set(null);
  }

  openForgotPasswordModal() {
    this.resetEmail = '';
    this.hasResetSubmitted.set(false);
    this.resetError.set(null);
    this.resetSuccess.set(null);
    this.isForgotPasswordOpen.set(true);
  }

  isEmailValid(val: string): boolean {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val.trim());
  }

  async onLogin() {
    this.hasSubmitted.set(true);
    this.errorMessage.set(null);

    const cleanEmail = this.email.trim();
    const cleanPassword = this.password.trim();

    if (!cleanEmail || !cleanPassword) {
      this.errorMessage.set('Please fill out all required fields.');
      return;
    }

    this.isLoading.set(true);

    try {
      await this.authService.login(cleanEmail, this.selectedRole(), cleanPassword);
      this.isLoading.set(false);

      const user = this.authService.currentUser();
      const userName = user?.displayName || cleanEmail;
      this.toastMessage.set(`Login successful! Welcome back, ${userName}. Redirecting to home...`);

      setTimeout(() => {
        this.router.navigate(['/home/hero-section'], { replaceUrl: true });
      }, 1200);
    } catch (err: any) {
      this.isLoading.set(false);
      this.errorMessage.set(err.message || 'Invalid credentials or authentication failure.');
    }
  }

  async sendPasswordReset() {
    this.hasResetSubmitted.set(true);
    this.resetError.set(null);
    this.resetSuccess.set(null);

    const cleanEmail = this.resetEmail.trim().toLowerCase();

    if (!cleanEmail) {
      this.resetError.set('Please enter your email address.');
      return;
    }

    if (!this.isEmailValid(cleanEmail)) {
      this.resetError.set('Please enter a valid email address (e.g. example@gmail.com).');
      return;
    }

    try {
      await this.authService.sendPasswordResetEmail(cleanEmail);
      const roleName = this.selectedRole() === 'tourist' ? 'Tourist' : this.selectedRole() === 'officer' ? 'Officer' : 'Administrator';
      this.resetSuccess.set(`Password reset link dispatched via Firebase Auth to ${cleanEmail} for your ${roleName} account.`);
      setTimeout(() => {
        this.isForgotPasswordOpen.set(false);
        this.resetSuccess.set(null);
        this.hasResetSubmitted.set(false);
      }, 2500);
    } catch (err: any) {
      this.resetError.set(err.message || 'Failed to send password reset email.');
    }
  }
}
