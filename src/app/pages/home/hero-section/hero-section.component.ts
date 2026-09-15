import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { HomeAboutSectionComponent } from '../home-about-section/home-about-section.component';
import { IconComponent } from '../../../common/components/icon.component';
import { GrievanceService } from '../../../core/services/grievance.service';
import { DepartmentService } from '../../../core/services/department.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-hero-section',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HomeAboutSectionComponent, IconComponent],
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

  async trackComplaint() {
    const code = this.searchQuery.trim();
    if (!code) {
      this.searchError.set('Enter grievance code');
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.searchError.set(null);

    // If grievances not yet loaded into signal, load them first
    if (this.grievanceService.grievances().length === 0) {
      await this.grievanceService.loadGrievancesFromBackend();
    }

    const found = this.grievanceService.getGrievanceById(code);
    if (!found) {
      this.searchError.set('No grievance found');
      return;
    }

    const user = this.authService.currentUser();
    const role = this.authService.userRole();

    // 1. Admin: route to /admin/grievances?id=:id to open detail view directly
    if (role === 'admin') {
      this.router.navigate(['/admin/grievances'], { queryParams: { id: found.id } });
      return;
    }

    // 2. Officer: route to /officer/process/:id, authorized only for assigned officer
    if (role === 'officer') {
      const cleanEmail = (user?.email || '').trim().toLowerCase();
      const cleanName = (user?.displayName || '').trim().toLowerCase();
      const assignedId = (found.assignedOfficerId || '').trim();
      const assignedName = (found.assignedOfficerName || '').trim().toLowerCase();

      const isAssigned = (user?.uid && assignedId === user.uid) ||
        (cleanEmail && assignedId.toLowerCase() === cleanEmail) ||
        (cleanName && assignedName === cleanName);

      if (isAssigned) {
        this.router.navigate(['/officer/process', found.id]);
      } else {
        this.searchError.set('You are not authorized to process this grievance. It is not assigned to you.');
        this.router.navigate(['/officer/dashboard']);
      }
      return;
    }

    // 3. Tourist: route to /tourist/grievance/:id, allowed only for owner
    if (role === 'tourist') {
      const cleanEmail = (user?.email || '').trim().toLowerCase();
      const isOwner = (user?.uid && found.touristId === user.uid) ||
        (cleanEmail && (found.touristEmail || '').trim().toLowerCase() === cleanEmail);

      if (isOwner) {
        this.router.navigate(['/tourist/grievance', found.id]);
      } else {
        this.searchError.set('You are not authorized to view this grievance. It belongs to another tourist.');
      }
      return;
    }

    // Default fallback
    this.searchError.set('No grievance found');
  }
}
