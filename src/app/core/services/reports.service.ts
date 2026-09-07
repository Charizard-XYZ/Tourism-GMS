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

    const activeList = list.filter(g => g.status !== 'cancelled');
    const totalComplaints = list.length;
    const pending = activeList.filter(g => g.status === 'submitted' || g.status === 'under_review').length;
    const inProgress = activeList.filter(g => g.status === 'assigned' || g.status === 'in_progress' || g.status === 'reopened').length;
    const resolved = activeList.filter(g => g.status === 'resolved' || g.status === 'closed').length;
    const cancelled = list.filter(g => g.status === 'cancelled').length;
    const escalated = activeList.filter(g => g.isEscalated).length;
    const activeCount = activeList.length;

    return {
      totalComplaints,
      pending,
      inProgress,
      resolved,
      cancelled,
      escalated,
      totalDepartments: depts.length,
      totalOfficers: this.authService.registeredOfficers().length,
      resolutionRate: activeCount > 0 ? Math.round((resolved / activeCount) * 100) : 0
    };
  }

  getDepartmentBreakdown() {
    const depts = this.departmentService.departments();
    const grievances = this.grievanceService.grievances();

    return depts.map(dept => {
      const allDeptGrievances = grievances.filter(g => g.departmentId === dept.id || g.departmentName === dept.name || g.category === dept.name);
      const deptGrievances = allDeptGrievances.filter(g => g.status !== 'cancelled');
      const resolved = deptGrievances.filter(g => g.status === 'resolved' || g.status === 'closed').length;
      return {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        description: dept.description,
        total: deptGrievances.length,
        resolved,
        pending: deptGrievances.length - resolved,
        cancelled: allDeptGrievances.length - deptGrievances.length,
        slaCompliance: deptGrievances.length > 0 ? Math.round((resolved / deptGrievances.length) * 100) : 100
      };
    });
  }
}
