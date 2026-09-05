import { Routes } from '@angular/router';
import { HeroSectionComponent } from './pages/home/hero-section/hero-section.component';
import { LoginComponent } from './pages/auth/login.component';
import { RegisterComponent } from './pages/auth/register.component';

import { TouristDashboardComponent } from './pages/tourist/tourist-dashboard.component';
import { GrievanceSubmissionComponent } from './pages/tourist/grievance-submission.component';
import { GrievanceHistoryComponent } from './pages/tourist/grievance-history.component';
import { GrievanceDetailComponent } from './pages/tourist/grievance-detail.component';

import { OfficerDashboardComponent } from './pages/officer/officer-dashboard.component';
import { AssignedGrievancesComponent } from './pages/officer/assigned-grievances.component';
import { GrievanceProcessingComponent } from './pages/officer/grievance-processing.component';

import { AdminDashboardComponent } from './pages/admin/admin-dashboard.component';
import { DepartmentManagementComponent } from './pages/admin/department-management.component';
import { OfficerManagementComponent } from './pages/admin/officer-management.component';
import { GrievanceAssignmentComponent } from './pages/admin/grievance-assignment.component';
import { ReportsAnalyticsComponent } from './pages/admin/reports-analytics.component';
import { SystemSettingsComponent } from './pages/admin/system-settings.component';

import { adminGuard, officerGuard, touristGuard, guestGuard } from './core/guards/role.guard';

import { ProfileComponent } from './pages/profile/profile.component';

export const routes: Routes = [
  { path: '', component: HeroSectionComponent },
  { path: 'home/hero-section', component: HeroSectionComponent },
  { path: 'auth/login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'auth/register', component: RegisterComponent, canActivate: [guestGuard] },

  // Profile Route (Available to Tourist, Officer, and Admin)
  { path: 'profile', component: ProfileComponent },

  // Tourist Portal Routes
  { path: 'tourist/dashboard', component: TouristDashboardComponent, canActivate: [touristGuard] },
  { path: 'tourist/submit', component: GrievanceSubmissionComponent, canActivate: [touristGuard] },
  { path: 'tourist/history', component: GrievanceHistoryComponent, canActivate: [touristGuard] },
  { path: 'tourist/grievance/:id', component: GrievanceDetailComponent, canActivate: [touristGuard] },
  { path: 'tourist/profile', component: ProfileComponent, canActivate: [touristGuard] },



  // Officer Portal Routes
  { path: 'officer/dashboard', component: OfficerDashboardComponent, canActivate: [officerGuard] },
  { path: 'officer/grievances', component: AssignedGrievancesComponent, canActivate: [officerGuard] },
  { path: 'officer/process/:id', component: GrievanceProcessingComponent, canActivate: [officerGuard] },
  { path: 'officer/profile', component: ProfileComponent, canActivate: [officerGuard] },

  // Admin Portal Routes
  { path: 'admin/dashboard', component: AdminDashboardComponent, canActivate: [adminGuard] },
  { path: 'admin/departments', component: DepartmentManagementComponent, canActivate: [adminGuard] },
  { path: 'admin/officers', component: OfficerManagementComponent, canActivate: [adminGuard] },
  { path: 'admin/grievances', component: GrievanceAssignmentComponent, canActivate: [adminGuard] },
  { path: 'admin/reports', component: ReportsAnalyticsComponent, canActivate: [adminGuard] },
  { path: 'admin/settings', component: SystemSettingsComponent, canActivate: [adminGuard] },
  { path: 'admin/profile', component: ProfileComponent, canActivate: [adminGuard] },

  { path: '**', redirectTo: '' }
];
