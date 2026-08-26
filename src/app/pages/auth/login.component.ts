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

  selectedRole = signal<UserRole>('citizen');
  email = '';
  password = '';
  showPassword = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  hasSubmitted = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  toastMessage = signal<string | null>(null);

  isForgotPasswordOpen = signal<boolean>(false);
  resetEmail = '';
  resetSuccess = signal<string | null>(null);

  setRole(role: UserRole) {
    this.selectedRole.set(role);
    this.hasSubmitted.set(false);
    this.errorMessage.set(null);
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

  sendPasswordReset() {
    if (!this.resetEmail.trim()) return;
    this.resetSuccess.set(`Password reset link dispatched to ${this.resetEmail}`);
    setTimeout(() => {
      this.isForgotPasswordOpen.set(false);
      this.resetSuccess.set(null);
    }, 2000);
  }
}
