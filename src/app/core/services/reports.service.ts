import { Injectable, inject } from '@angular/core';
import { GrievanceService } from './grievance.service';
import { DepartmentService } from './department.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private grievanceService = inject(GrievanceService);
  private departmentService = inject(DepartmentService);
  private authService = inject(AuthService);

  getOverallMetrics() {
    const list = this.grievanceService.grievances();
    const depts = this.departmentService.departments();

    const totalComplaints = list.length;
    const pending = list.filter(g => g.status === 'submitted' || g.status === 'under_review').length;
    const inProgress = list.filter(g => g.status === 'assigned' || g.status === 'in_progress' || g.status === 'reopened').length;
    const resolved = list.filter(g => g.status === 'resolved' || g.status === 'closed').length;
    const escalated = list.filter(g => g.isEscalated).length;

    return {
      totalComplaints,
      pending,
      inProgress,
      resolved,
      escalated,
      totalDepartments: depts.length,
      totalOfficers: this.authService.registeredOfficers().length,
      resolutionRate: totalComplaints > 0 ? Math.round((resolved / totalComplaints) * 100) : 0
    };
  }

  getDepartmentBreakdown() {
    const depts = this.departmentService.departments();
    const grievances = this.grievanceService.grievances();

    return depts.map(dept => {
      const deptGrievances = grievances.filter(g => g.departmentId === dept.id || g.departmentName === dept.name || g.category === dept.name);
      const resolved = deptGrievances.filter(g => g.status === 'resolved' || g.status === 'closed').length;
      return {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        description: dept.description,
        total: deptGrievances.length,
        resolved,
        pending: deptGrievances.length - resolved,
        slaCompliance: deptGrievances.length > 0 ? Math.round((resolved / deptGrievances.length) * 100) : 100
      };
    });
  }
}
