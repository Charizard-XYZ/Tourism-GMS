import { Injectable, inject } from '@angular/core';
import { GrievanceService } from './grievance.service';
import { DepartmentService } from './department.service';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private grievanceService = inject(GrievanceService);
  private departmentService = inject(DepartmentService);

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
      totalOfficers: 93,
      resolutionRate: totalComplaints > 0 ? Math.round((resolved / totalComplaints) * 100) : 0,
      avgResolutionDays: 1.8
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

  exportToCsv(filename: string, rows: object[]): void {
    if (!rows || !rows.length) return;
    const separator = ',';
    const keys = Object.keys(rows[0]);
    const csvContent =
      keys.join(separator) +
      '\n' +
      rows
        .map((row: any) => {
          return keys
            .map(k => {
              let cell = row[k] === null || row[k] === undefined ? '' : row[k];
              cell = cell.toString().replace(/"/g, '""');
              if (cell.search(/("|,|\n)/g) >= 0) {
                cell = `"${cell}"`;
              }
              return cell;
            })
            .join(separator);
        })
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  printReport(reportTitle: string): void {
    window.print();
  }
}
