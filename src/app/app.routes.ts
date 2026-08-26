import { Routes } from '@angular/router';
import { HeroSectionComponent } from './pages/home/hero-section/hero-section.component';
import { LoginComponent } from './pages/auth/login.component';
import { RegisterComponent } from './pages/auth/register.component';

import { CitizenDashboardComponent } from './pages/citizen/citizen-dashboard.component';
import { GrievanceSubmissionComponent } from './pages/citizen/grievance-submission.component';
import { GrievanceHistoryComponent } from './pages/citizen/grievance-history.component';
import { GrievanceDetailComponent } from './pages/citizen/grievance-detail.component';

import { OfficerDashboardComponent } from './pages/officer/officer-dashboard.component';
import { AssignedGrievancesComponent } from './pages/officer/assigned-grievances.component';
import { GrievanceProcessingComponent } from './pages/officer/grievance-processing.component';

import { AdminDashboardComponent } from './pages/admin/admin-dashboard.component';
import { DepartmentManagementComponent } from './pages/admin/department-management.component';
import { OfficerManagementComponent } from './pages/admin/officer-management.component';
import { GrievanceAssignmentComponent } from './pages/admin/grievance-assignment.component';
import { ReportsAnalyticsComponent } from './pages/admin/reports-analytics.component';
import { SystemSettingsComponent } from './pages/admin/system-settings.component';

import { adminGuard, officerGuard, citizenGuard, guestGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', component: HeroSectionComponent },
  { path: 'home/hero-section', component: HeroSectionComponent },
  { path: 'auth/login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'auth/register', component: RegisterComponent, canActivate: [guestGuard] },

  // Citizen Portal Routes
  { path: 'citizen/dashboard', component: CitizenDashboardComponent, canActivate: [citizenGuard] },
  { path: 'citizen/submit', component: GrievanceSubmissionComponent, canActivate: [citizenGuard] },
  { path: 'citizen/history', component: GrievanceHistoryComponent, canActivate: [citizenGuard] },
  { path: 'citizen/grievance/:id', component: GrievanceDetailComponent, canActivate: [citizenGuard] },

  // Officer Portal Routes
  { path: 'officer/dashboard', component: OfficerDashboardComponent, canActivate: [officerGuard] },
  { path: 'officer/grievances', component: AssignedGrievancesComponent, canActivate: [officerGuard] },
  { path: 'officer/process/:id', component: GrievanceProcessingComponent, canActivate: [officerGuard] },

  // Admin Portal Routes
  { path: 'admin/dashboard', component: AdminDashboardComponent, canActivate: [adminGuard] },
  { path: 'admin/departments', component: DepartmentManagementComponent, canActivate: [adminGuard] },
  { path: 'admin/officers', component: OfficerManagementComponent, canActivate: [adminGuard] },
  { path: 'admin/grievances', component: GrievanceAssignmentComponent, canActivate: [adminGuard] },
  { path: 'admin/reports', component: ReportsAnalyticsComponent, canActivate: [adminGuard] },
  { path: 'admin/settings', component: SystemSettingsComponent, canActivate: [adminGuard] },

  { path: '**', redirectTo: '' }
];
