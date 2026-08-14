import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { HomeAboutSectionComponent } from '../home-about-section/home-about-section.component';
import { GrievanceService } from '../../../core/services/grievance.service';
import { DepartmentService } from '../../../core/services/department.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-hero-section',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HomeAboutSectionComponent],
  templateUrl: './hero-section.component.html',
  styleUrl: './hero-section.component.css'
})
export class HeroSectionComponent {
  grievanceService = inject(GrievanceService);
  departmentService = inject(DepartmentService);
  authService = inject(AuthService);
  router = inject(Router);

  searchQuery = '';
  searchError = signal<string | null>(null);

  trackComplaint() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    if (this.authService.isOfficer()) {
      this.router.navigate(['/officer/dashboard']);
      return;
    }

    if (this.authService.isAdmin()) {
      this.router.navigate(['/admin/grievances']);
      return;
    }

    // Citizen / Tourist
    if (!this.searchQuery.trim()) {
      this.router.navigate(['/citizen/dashboard']);
      return;
    }
    this.searchError.set(null);

    const found = this.grievanceService.getGrievanceById(this.searchQuery.trim());
    if (found) {
      this.router.navigate(['/citizen/grievance', found.id]);
    } else {
      this.searchError.set(`No complaint found with Tracking Code "${this.searchQuery}". Try GMS-2026-8941`);
    }
  }
}
