import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastComponent } from '../../common/components/toast.component';
import { formatPhoneNumber } from '../../core/models/user.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ToastComponent],
  template: `
    <div class="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div class="max-w-md w-full space-y-6 bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
        
        <!-- Back to Home -->
        <div>
          <a routerLink="/" class="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-teal-700 transition">
            <span>← Back to Home</span>
          </a>
        </div>

        <div class="text-center">
          <img src="Web-Logo.jpg" alt="Tourism GMS Logo" class="w-16 h-16 rounded-2xl object-cover mx-auto shadow-md mb-3" />
          <h2 class="text-2xl font-extrabold text-slate-900">Tourist Account Registration</h2>
          <p class="mt-1 text-xs text-slate-500">Create a secure profile to lodge grievances and track live status</p>
        </div>

        <form (submit)="onRegister()" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name *</label>
            <input type="text" [(ngModel)]="name" name="usr_ident_title" required autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" placeholder="Enter your name" class="w-full px-4 py-2.5 border rounded-xl text-sm" />
            <p *ngIf="hasSubmitted() && !name.trim()" class="text-[11px] text-rose-600 font-bold mt-1">Please fill out all required fields.</p>
            <p *ngIf="hasSubmitted() && name.trim() && isNameNumericInvalid(name)" class="text-[11px] text-rose-600 font-bold mt-1">Names can not be in number</p>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address *</label>
            <input type="text" [(ngModel)]="email" name="reg_usr_comm_id" required autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" placeholder="example@gmail.com" class="w-full px-4 py-2.5 border rounded-xl text-sm" />
            <p *ngIf="hasSubmitted() && !email.trim()" class="text-[11px] text-rose-600 font-bold mt-1">Please fill out all required fields.</p>
            <p *ngIf="hasSubmitted() && email.trim() && !isEmailValid(email)" class="text-[11px] text-rose-600 font-bold mt-1">Invalid email format. Must be in format: username@gmail.com</p>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Mobile Phone Number *</label>
            <input 
              type="text" 
              [ngModel]="phone" 
              (ngModelChange)="onPhoneChange($event)"
              name="usr_mobile_num" 
              required 
              autocomplete="one-time-code" 
              autocorrect="off" 
              autocapitalize="off" 
              spellcheck="false" 
              data-lpignore="true" 
              placeholder="Enter mobile number" 
              class="w-full px-4 py-2.5 border rounded-xl text-sm" 
            />
            <p *ngIf="hasSubmitted() && !phone.trim()" class="text-[11px] text-rose-600 font-bold mt-1">Please fill out all required fields.</p>
            <p *ngIf="hasSubmitted() && phone.trim() && isPhoneTextInvalid(phone)" class="text-[11px] text-rose-600 font-bold mt-1">Enter phone number</p>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Create Password *</label>
            <div class="relative">
              <input 
                type="text" 
                [style.-webkit-text-security]="showPassword() ? 'none' : 'disc'" 
                [(ngModel)]="password" 
                name="reg_sec_pass" 
                required 
                autocomplete="one-time-code" 
                autocorrect="off" 
                autocapitalize="off" 
                spellcheck="false"
                data-lpignore="true" 
                placeholder="••••••••" 
                class="w-full px-4 py-2.5 pr-10 border rounded-xl text-sm font-mono" 
              />
              <button 
                type="button" 
                (click)="showPassword.set(!showPassword())" 
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm p-1 focus:outline-none"
              >
                {{ showPassword() ? 'Hide' : 'Show' }}
              </button>
            </div>
            <p *ngIf="hasSubmitted() && !password.trim()" class="text-[11px] text-rose-600 font-bold mt-1">Please fill out all required fields.</p>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Confirm Password *</label>
            <div class="relative">
              <input 
                type="text" 
                [style.-webkit-text-security]="showConfirmPassword() ? 'none' : 'disc'" 
                [(ngModel)]="confirmPassword" 
                name="reg_confirm_sec_pass" 
                required 
                autocomplete="one-time-code" 
                autocorrect="off" 
                autocapitalize="off" 
                spellcheck="false"
                data-lpignore="true" 
                placeholder="••••••••" 
                class="w-full px-4 py-2.5 pr-10 border rounded-xl text-sm font-mono" 
              />
              <button 
                type="button" 
                (click)="showConfirmPassword.set(!showConfirmPassword())" 
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm p-1 focus:outline-none"
              >
                {{ showConfirmPassword() ? 'Hide' : 'Show' }}
              </button>
            </div>
            <p *ngIf="hasSubmitted() && !confirmPassword.trim()" class="text-[11px] text-rose-600 font-bold mt-1">Please fill out all required fields.</p>
            <p *ngIf="hasSubmitted() && password.trim() && confirmPassword.trim() && password !== confirmPassword" class="text-[11px] text-rose-600 font-bold mt-1">Passwords do not match.</p>
          </div>

          <div *ngIf="errorMessage()" class="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {{ errorMessage() }}
          </div>

          <button 
            type="submit" 
            [disabled]="isLoading()"
            class="w-full bg-[#0F172A] text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg"
          >
            {{ isLoading() ? 'Creating Account...' : 'Register Account' }}
          </button>
        </form>

        <div class="text-center pt-3 text-xs text-slate-500 border-t border-slate-100">
          Already registered? <a routerLink="/auth/login" class="text-teal-700 font-bold hover:underline">Log in here</a>
        </div>

      </div>

      <app-toast [message]="toastMessage()" (dismiss)="toastMessage.set(null)"></app-toast>
    </div>
  `
})
export class RegisterComponent {
  authService = inject(AuthService);
  router = inject(Router);

  name = '';
  email = '';
  phone = '';
  password = '';
  confirmPassword = '';
  showPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  hasSubmitted = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  toastMessage = signal<string | null>(null);

  onPhoneChange(val: string) {
    this.phone = val;
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

  async onRegister() {
    this.hasSubmitted.set(true);
    this.errorMessage.set(null);

    if (!this.name.trim() || !this.email.trim() || !this.phone.trim() || !this.password.trim() || !this.confirmPassword.trim()) {
      this.errorMessage.set('Please fill out all required fields.');
      return;
    }

    if (this.isNameNumericInvalid(this.name)) {
      this.errorMessage.set('Names can not be in number');
      return;
    }

    if (this.isPhoneTextInvalid(this.phone)) {
      this.errorMessage.set('Enter phone number');
      return;
    }

    if (!this.isEmailValid(this.email)) {
      this.errorMessage.set('Invalid email format. Please enter a valid email address (e.g. user@gmail.com).');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage.set('Passwords do not match. Please re-enter passwords.');
      return;
    }

    this.isLoading.set(true);
    try {
      const formattedPhone = formatPhoneNumber(this.phone);
      await this.authService.register(this.name.trim(), this.email.trim(), formattedPhone, this.password.trim());
      this.isLoading.set(false);
      this.toastMessage.set(`Registration successful! Account created for "${this.name.trim()}". Redirecting to home...`);
      setTimeout(() => {
        this.router.navigate(['/home/hero-section'], { replaceUrl: true });
      }, 1200);
    } catch (err: any) {
      this.isLoading.set(false);
      this.errorMessage.set(err.message || 'Registration failed.');
    }
  }
}
