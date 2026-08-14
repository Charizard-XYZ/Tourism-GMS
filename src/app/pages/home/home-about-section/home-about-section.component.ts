import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DepartmentService } from '../../../core/services/department.service';

@Component({
  selector: 'app-home-about-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-about-section.component.html',
  styleUrls: ['./home-about-section.component.css'],
})
export class HomeAboutSectionComponent {
  departmentService = inject(DepartmentService);

  activeDepartments() {
    return this.departmentService.departments().filter(d => d.isActive);
  }
}
