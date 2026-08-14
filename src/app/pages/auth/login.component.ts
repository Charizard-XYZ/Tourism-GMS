import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
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
  errorMessage = signal<string | null>(null);

  isForgotPasswordOpen = signal<boolean>(false);
  resetEmail = '';
  resetSuccess = signal<string | null>(null);

  setRole(role: UserRole) {
    this.selectedRole.set(role);
    this.errorMessage.set(null);
  }

  async onLogin() {
    this.errorMessage.set(null);

    const cleanEmail = this.email.trim();
    const cleanPassword = this.password.trim();

    if (!cleanEmail) {
      this.errorMessage.set('Please enter your email address before attempting to log in.');
      return;
    }

    if (!cleanPassword) {
      this.errorMessage.set('Please enter your password before attempting to log in.');
      return;
    }

    this.isLoading.set(true);

    try {
      await this.authService.login(cleanEmail, this.selectedRole(), cleanPassword);
      this.isLoading.set(false);

      if (this.selectedRole() === 'admin') {
        this.router.navigate(['/admin/home']);
      } else if (this.selectedRole() === 'officer') {
        this.router.navigate(['/officer/home']);
      } else {
        this.router.navigate(['/citizen/home']);
      }
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
