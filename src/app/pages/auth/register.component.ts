import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div class="max-w-md w-full space-y-6 bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
        
        <div class="text-center">
          <img src="Web-Logo.jpg" alt="Tourism GMS Logo" class="w-16 h-16 rounded-2xl object-cover mx-auto shadow-md mb-3" />
          <h2 class="text-2xl font-extrabold text-slate-900">Tourist Account Registration</h2>
          <p class="mt-1 text-xs text-slate-500">Create a secure profile to lodge grievances and track live status</p>
        </div>

        <form (submit)="onRegister()" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name *</label>
            <input type="text" [(ngModel)]="name" name="usr_ident_title" required autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" placeholder="Enter your name" class="w-full px-4 py-2.5 border rounded-xl text-sm" />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address *</label>
            <input type="text" [(ngModel)]="email" name="reg_usr_comm_id" required autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" placeholder="example@gmail.com" class="w-full px-4 py-2.5 border rounded-xl text-sm" />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Mobile Phone Number *</label>
            <input type="text" [(ngModel)]="phone" name="usr_mobile_num" required autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" placeholder="Enter your phone number" class="w-full px-4 py-2.5 border rounded-xl text-sm" />
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
  errorMessage = signal<string | null>(null);

  async onRegister() {
    this.errorMessage.set(null);

    if (!this.name || !this.email || !this.password) {
      this.errorMessage.set('Please fill out all required fields.');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage.set('Passwords do not match. Please re-enter passwords.');
      return;
    }

    this.isLoading.set(true);
    try {
      await this.authService.register(this.name, this.email, this.phone, this.password);
      this.isLoading.set(false);
      this.router.navigate(['/citizen/home']);
    } catch (err: any) {
      this.isLoading.set(false);
      this.errorMessage.set(err.message || 'Registration failed.');
    }
  }
}
