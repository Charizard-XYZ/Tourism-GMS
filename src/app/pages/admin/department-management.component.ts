import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DepartmentService } from '../../core/services/department.service';
import { AuthService } from '../../core/services/auth.service';
import { GrievanceService } from '../../core/services/grievance.service';
import { Department } from '../../core/models/department.model';
import { ToastComponent } from '../../common/components/toast.component';
import { IconComponent } from '../../common/components/icon.component';
import { isPhoneTextInvalid, formatPhoneNumber } from '../../core/models/user.model';
import { capitalizeFirstChar } from '../../core/directives/capitalize-first.directive';

@Component({
  selector: 'app-department-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastComponent, IconComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <!-- Top Title Header -->
      <div class="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div class="inline-flex items-center space-x-2 px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-xs font-bold uppercase mb-1">
            <app-icon name="building" size="w-3.5 h-3.5"></app-icon>
            <span>Directorate Admin Panel</span>
          </div>
          <h1 class="text-2xl font-extrabold text-slate-900">Department Directory & Officers</h1>
          <p class="text-xs text-slate-500">Configure Directorate Departments and assign Officers from the registered officers</p>
        </div>

        <div class="flex items-center space-x-3">
          <button (click)="openCreateModal()" class="px-5 py-2.5 bg-[#0F172A] text-white rounded-xl text-xs font-extrabold hover:bg-slate-800 shadow-lg flex items-center space-x-2 transition">
            <app-icon name="plus" size="w-4 h-4"></app-icon>
            <span>Create New Department</span>
          </button>
        </div>
      </div>

      <!-- Department Grid Cards -->
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div *ngFor="let dept of departmentService.departments()" class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition">
          
          <div class="space-y-3">
            <div class="flex justify-between items-start">
              <div>
                <span class="text-[10px] font-extrabold font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md uppercase">{{ dept.code }}</span>
                <h3 class="text-lg font-bold text-slate-900 mt-1">{{ dept.name }}</h3>
              </div>

              <!-- Status Switch Toggle -->
              <button 
                (click)="toggleStatus(dept.id)"
                [disabled]="togglingDeptId() === dept.id"
                [class.bg-emerald-100]="dept.isActive"
                [class.text-emerald-800]="dept.isActive"
                [class.bg-rose-100]="!dept.isActive"
                [class.text-rose-800]="!dept.isActive"
                class="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase transition disabled:opacity-50 inline-flex items-center min-h-[26px] min-w-[85px] justify-center"
              >
                <app-icon *ngIf="togglingDeptId() === dept.id" name="loader" size="w-3 h-3" class="animate-spin mr-1 shrink-0"></app-icon>
                <span>{{ togglingDeptId() === dept.id ? 'Updating...' : (dept.isActive ? 'Active' : 'Inactive') }}</span>
              </button>
            </div>

            <p class="text-xs text-slate-600 line-clamp-2">{{ dept.description }}</p>

            <div class="text-xs space-y-1 text-slate-500 font-mono bg-slate-50 p-3 rounded-xl">
              <p class="flex items-center space-x-2"><app-icon name="phone" size="w-3.5 h-3.5 text-slate-400"></app-icon><span>Phone: <span class="font-bold text-slate-800">{{ dept.contactPhone }}</span></span></p>
              <p class="flex items-center space-x-2"><app-icon name="mail" size="w-3.5 h-3.5 text-slate-400"></app-icon><span>Email: <span class="font-bold text-slate-800 truncate">{{ dept.contactEmail }}</span></span></p>
            </div>
          </div>

          <!-- Multiple Assigned Officers Box -->
          <div class="space-y-2 border-t pt-3">
            <div class="flex justify-between items-center flex-wrap gap-1.5">
              <span class="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center space-x-1">
                <app-icon name="users" size="w-3.5 h-3.5 text-slate-500"></app-icon>
                <span>Assigned Officers ({{ dept.assignedOfficers?.length || 0 }})</span>
              </span>
              <div class="flex items-center space-x-1.5">
                <button 
                  type="button" 
                  (click)="openRegisterOfficerModal(dept)" 
                  class="px-2 py-1 bg-[#0F172A] text-white rounded-lg text-[10px] font-bold hover:bg-slate-800 transition shadow-xs inline-flex items-center space-x-1"
                  title="Register a new officer"
                >
                  <app-icon name="user-plus" size="w-3 h-3 text-slate-200"></app-icon>
                  <span>Register Officer</span>
                </button>
                <button 
                  type="button" 
                  (click)="openQuickAddOfficerModal(dept)" 
                  class="text-[11px] font-extrabold text-teal-700 hover:underline flex items-center space-x-1"
                >
                  <app-icon name="plus" size="w-3.5 h-3.5"></app-icon>
                  <span>Add Officer</span>
                </button>
              </div>
            </div>

            <div *ngIf="dept.assignedOfficers && dept.assignedOfficers.length > 0" class="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              <div *ngFor="let off of dept.assignedOfficers" class="flex items-center justify-between p-2 bg-slate-50 rounded-xl text-xs border border-slate-200">
                <div class="truncate pr-2">
                  <p class="font-bold text-slate-900 truncate">{{ off.name }}</p>
                  <p class="text-[10px] text-slate-500 font-mono truncate">{{ off.email }}</p>
                </div>
                <button (click)="confirmRemoveOfficer(dept.id, off.id, off.name)" [disabled]="isConfirmingAction() || activeActionDeptOfficerId() === (dept.id + '_' + off.id)" title="Remove Officer from Department" class="text-rose-600 font-bold px-1.5 py-1 hover:bg-rose-100 rounded text-xs transition flex items-center justify-center disabled:opacity-50 min-w-[28px] min-h-[28px]">
                  <app-icon *ngIf="activeActionDeptOfficerId() === (dept.id + '_' + off.id)" name="loader" size="w-3.5 h-3.5" class="animate-spin shrink-0"></app-icon>
                  <app-icon *ngIf="activeActionDeptOfficerId() !== (dept.id + '_' + off.id)" name="user-x" size="w-3.5 h-3.5"></app-icon>
                </button>
              </div>
            </div>

            <div *ngIf="!dept.assignedOfficers || dept.assignedOfficers.length === 0" class="text-xs text-slate-400 italic p-2 bg-slate-50 rounded-xl">
              <span>No Officers assigned yet.</span>
            </div>
          </div>

          <div class="pt-3 border-t flex space-x-2">
            <button (click)="openEditModal(dept)" class="flex-1 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition flex items-center justify-center space-x-1.5">
              <app-icon name="edit" size="w-3.5 h-3.5 text-slate-600"></app-icon>
              <span>Edit Dept</span>
            </button>
            <button (click)="confirmDeleteDepartment(dept.id, dept.name)" [disabled]="isConfirmingAction() || deletingDeptId() === dept.id" class="px-3 py-2 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold hover:bg-rose-100 transition flex items-center justify-center space-x-1 disabled:opacity-50 min-h-[32px] min-w-[70px]">
              <app-icon *ngIf="deletingDeptId() === dept.id" name="loader" size="w-3.5 h-3.5" class="animate-spin shrink-0 text-rose-600"></app-icon>
              <app-icon *ngIf="deletingDeptId() !== dept.id" name="trash" size="w-3.5 h-3.5 text-rose-600"></app-icon>
              <span>{{ deletingDeptId() === dept.id ? 'Deleting...' : 'Delete' }}</span>
            </button>
          </div>

        </div>
      </div>

      <!-- Create / Edit Department Modal -->
      <div *ngIf="isModalOpen()" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
        <div class="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-modal-pop max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center border-b pb-3">
            <h3 class="font-bold text-lg text-slate-900">{{ editingDeptId ? 'Edit Department' : 'Create New Department' }}</h3>
            <button (click)="isModalOpen.set(false)" aria-label="Close modal" class="text-slate-400 hover:text-slate-600 transition">
              <app-icon name="x" size="w-5 h-5"></app-icon>
            </button>
          </div>

          <form (submit)="promptSaveDepartment()" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Department Name *</label>
                <input type="text" [ngModel]="deptForm.name" (ngModelChange)="onDeptNameChange($event)" name="sec_dept_ident" required autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" placeholder="Enter Department name" class="w-full px-4 py-2.5 border rounded-xl text-xs" />
                <p *ngIf="hasSubmitted() && !deptForm.name.trim()" class="text-[11px] text-rose-600 font-bold mt-1">Please fill out all required fields.</p>
                <p *ngIf="hasSubmitted() && deptForm.name.trim() && isNameNumericInvalid(deptForm.name)" class="text-[11px] text-rose-600 font-bold mt-1">Names can not be in number</p>
                <p *ngIf="hasSubmitted() && isNameAndCodeSame()" class="text-[11px] text-rose-600 font-bold mt-1">Department Name and Department Code / ID should not be the same.</p>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Department Code *</label>
                <input type="text" [(ngModel)]="deptForm.code" name="code" required autocomplete="one-time-code" autocorrect="off" autocapitalize="on" spellcheck="false" data-lpignore="true" placeholder="e.g. TS-CELL" class="w-full px-4 py-2.5 border rounded-xl text-xs font-mono" />
                <p *ngIf="hasSubmitted() && !deptForm.code.trim()" class="text-[11px] text-rose-600 font-bold mt-1">Please fill out all required fields.</p>
                <p *ngIf="hasSubmitted() && isNameAndCodeSame()" class="text-[11px] text-rose-600 font-bold mt-1">Department Name and Department Code / ID should not be the same.</p>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Description *</label>
              <textarea [(ngModel)]="deptForm.description" name="description" rows="2" required autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" placeholder="Operational responsibilities..." class="w-full px-4 py-2.5 border rounded-xl text-xs"></textarea>
              <p *ngIf="hasSubmitted() && !deptForm.description.trim()" class="text-[11px] text-rose-600 font-bold mt-1">Please fill out all required fields.</p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Contact Phone *</label>
                <input type="text" [ngModel]="deptForm.contactPhone" (ngModelChange)="onDeptPhoneChange($event)" name="contactPhone" autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" placeholder="Enter mobile number" class="w-full px-4 py-2.5 border rounded-xl text-xs" />
                <p *ngIf="hasSubmitted() && !deptForm.contactPhone.trim()" class="text-[11px] text-rose-600 font-bold mt-1">Please fill out all required fields.</p>
                <p *ngIf="hasSubmitted() && deptForm.contactPhone.trim() && isPhoneTextInvalid(deptForm.contactPhone)" class="text-[11px] text-rose-600 font-bold mt-1">Enter phone number</p>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Official Email *</label>
                <input type="text" [(ngModel)]="deptForm.contactEmail" name="sec_dept_comm_addr" required autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" placeholder="example@gmail.com" class="w-full px-4 py-2.5 border rounded-xl text-xs" />
                <p *ngIf="hasSubmitted() && !deptForm.contactEmail.trim()" class="text-[11px] text-rose-600 font-bold mt-1">Please fill out all required fields.</p>
                <p *ngIf="hasSubmitted() && deptForm.contactEmail.trim() && !isEmailValid(deptForm.contactEmail)" class="text-[11px] text-rose-600 font-bold mt-1">Invalid email format. Must be in format: username@gmail.com</p>
              </div>
            </div>

            <!-- Multiple Assigned Officers (Select Registered Officers Only) -->
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-xs font-extrabold text-slate-800 uppercase">Assigned Officers</span>
                <div class="flex items-center space-x-2">
                  <button 
                    type="button" 
                    (click)="openRegisterOfficerModal()" 
                    class="px-2.5 py-1 bg-[#0F172A] text-white rounded-lg text-[11px] font-bold hover:bg-slate-800 transition shadow-xs inline-flex items-center space-x-1"
                    title="Register a new officer"
                  >
                    <app-icon name="user-plus" size="w-3.5 h-3.5"></app-icon>
                    <span>Register Officer</span>
                  </button>
                  <span class="text-[10px] text-slate-500">Total: {{ deptForm.assignedOfficers.length }}</span>
                </div>
              </div>

              <!-- List of Added Officers -->
              <div *ngIf="deptForm.assignedOfficers.length > 0" class="space-y-1.5">
                <div *ngFor="let off of deptForm.assignedOfficers; let i = index" class="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span class="font-bold text-slate-900">{{ off.name }}</span>
                    <span class="text-slate-500 text-[11px] ml-1 font-mono">({{ off.email }})</span>
                  </div>
                  <button type="button" (click)="removeOfficerFromForm(i)" class="text-rose-600 font-bold px-2 py-0.5 hover:bg-rose-50 rounded text-xs flex items-center space-x-1">
                    <app-icon name="trash" size="w-3.5 h-3.5"></app-icon>
                    <span>Remove</span>
                  </button>
                </div>
              </div>

              <!-- Select Registered Officer Dropdown (Unassigned Officers Only) -->
              <div class="pt-2 border-t border-slate-200 space-y-2">
                <p class="text-[11px] font-bold text-teal-800 uppercase">+ Assign Registered Unassigned Officer:</p>
                
                <div *ngIf="getUnassignedRegisteredOfficers().length > 0" class="space-y-2">
                  <select [(ngModel)]="selectedOfficerIdForForm" name="selectedOfficerId" class="w-full px-3 py-2 border rounded-xl text-xs bg-white font-bold">
                    <option value="">Select an unassigned registered officer...</option>
                    <option *ngFor="let off of getUnassignedRegisteredOfficers()" [value]="off.id">
                      {{ off.name }} ({{ off.email }})
                    </option>
                  </select>

                  <button 
                    type="button" 
                    (click)="addSelectedOfficerToForm()" 
                    [disabled]="!selectedOfficerIdForForm"
                    class="w-full py-2 bg-teal-700 text-white rounded-xl text-xs font-bold hover:bg-teal-800 disabled:opacity-50 flex items-center justify-center space-x-1.5"
                  >
                    <app-icon name="plus" size="w-4 h-4"></app-icon>
                    <span>Assign Selected Officer</span>
                  </button>
                </div>

                <div *ngIf="getUnassignedRegisteredOfficers().length === 0" class="text-xs text-amber-800 italic p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                  <span>No unassigned officers available. All registered officers are already assigned to operational departments.</span>
                </div>
              </div>
            </div>

            <div class="flex space-x-3 pt-4 border-t">
              <button type="button" [disabled]="isSavingDept()" (click)="isModalOpen.set(false)" class="flex-1 bg-slate-100 py-3 rounded-xl text-xs font-bold text-slate-600 disabled:opacity-50">Cancel</button>
              <button 
                type="submit" 
                [disabled]="isSavingDept()"
                class="flex-1 bg-[#0F172A] text-white py-3 rounded-xl text-xs font-extrabold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center space-x-1.5 min-h-[44px] min-w-[160px]"
              >
                <app-icon *ngIf="isSavingDept()" name="loader" size="w-4 h-4" class="animate-spin shrink-0"></app-icon>
                <span>{{ isSavingDept() ? (editingDeptId ? 'Updating...' : 'Adding Department...') : (editingDeptId ? 'Update Department' : 'Save Department') }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Add Officers Modal (Multi-Select Support & Single Officer Compatibility) -->
      <div *ngIf="isQuickAddOfficerModalOpen()" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
        <div class="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-modal-pop relative">
          <div class="flex justify-between items-center border-b pb-3">
            <div>
              <h3 class="font-bold text-base text-slate-900">Assign Officers to {{ selectedDeptForAddOfficer?.name }}</h3>
              <p class="text-[11px] text-slate-500">Select one or multiple officers to assign to this department</p>
            </div>
            <button (click)="isQuickAddOfficerModalOpen.set(false)" [disabled]="isAssigningOfficers()" aria-label="Close modal" class="text-slate-400 hover:text-slate-600 transition disabled:opacity-50">
              <app-icon name="x" size="w-5 h-5"></app-icon>
            </button>
          </div>

          <!-- Filter & Search Controls Bar -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <!-- Search Input -->
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <app-icon name="search" size="w-3.5 h-3.5"></app-icon>
              </div>
              <input 
                type="text" 
                [ngModel]="addOfficerSearchKeyword" 
                (ngModelChange)="onAddOfficerSearchChange($event)"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                spellcheck="false"
                data-lpignore="true"
                placeholder="Search officer name, ID, email..." 
                class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#A0C8C3] focus:bg-white transition"
              />
            </div>

            <!-- Department Filter Dropdown with SVG filter icon -->
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <app-icon name="filter" size="w-3.5 h-3.5"></app-icon>
              </div>
              <select 
                [(ngModel)]="addOfficerDeptFilter" 
                aria-label="Filter Officers by Department"
                class="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#A0C8C3] focus:bg-white transition appearance-none cursor-pointer"
              >
                <option value="ALL">All Departments</option>
                <option value="UNASSIGNED">Unassigned Officers</option>
                <option *ngFor="let d of departmentService.departments()" [value]="d.id">
                  {{ d.name }}
                </option>
              </select>
              <div class="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <!-- Selection Controls Bar -->
          <div *ngIf="getFilteredAvailableOfficers().length > 0" class="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
            <label class="flex items-center space-x-2 cursor-pointer font-bold text-slate-700 select-none">
              <input 
                type="checkbox" 
                [checked]="isAllSelected()" 
                (change)="toggleSelectAll()" 
                class="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
              />
              <span>Select All ({{ getFilteredAvailableOfficers().length }})</span>
            </label>
            <span class="text-[11px] font-extrabold text-teal-700">
              {{ selectedOfficerIdsForAdd.size }} selected
            </span>
          </div>

          <!-- Officer Selection List -->
          <div *ngIf="getFilteredAvailableOfficers().length > 0" class="space-y-2 max-h-64 overflow-y-auto pr-1">
            <div 
              *ngFor="let off of getFilteredAvailableOfficers()" 
              (click)="toggleOfficerSelection(off.id)"
              [class.border-teal-500]="isOfficerSelected(off.id)"
              [class.bg-teal-50]="isOfficerSelected(off.id)"
              [class.bg-white]="!isOfficerSelected(off.id)"
              class="flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer hover:border-teal-300"
            >
              <div class="flex items-center space-x-3 truncate pr-2">
                <input 
                  type="checkbox" 
                  [checked]="isOfficerSelected(off.id)" 
                  (click)="$event.stopPropagation()"
                  (change)="toggleOfficerSelection(off.id)"
                  class="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
                <div class="truncate">
                  <div class="flex items-center space-x-2">
                    <span class="font-bold text-slate-900 text-xs truncate">{{ off.name }}</span>
                    <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{{ off.userCode || off.id }}</span>
                  </div>
                  <p class="text-[10px] text-slate-500 font-mono truncate">
                    <span>{{ off.email }}</span>
                    <span *ngIf="!isOfficerUnassigned(off)" class="text-amber-700 font-bold ml-1">• Dept: {{ getOfficerDepartmentName(off) }}</span>
                  </p>
                </div>
              </div>

              <!-- Status Badge -->
              <div class="shrink-0 text-right">
                <span 
                  *ngIf="isOfficerUnassigned(off)" 
                  class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800"
                >
                  Unassigned
                </span>
                <span 
                  *ngIf="!isOfficerUnassigned(off)" 
                  class="inline-block max-w-[170px] truncate px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 align-middle"
                  title="Will be transferred from {{ getOfficerDepartmentName(off) }}"
                >
                  Transfer ({{ getOfficerDepartmentName(off) }})
                </span>
              </div>
            </div>
          </div>

          <div *ngIf="getAvailableOfficersForAssignment().length === 0" class="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
            <p class="text-xs font-medium text-amber-800">No registered officers available to assign. All non-revoked officers are already in this department.</p>
            <div>
              <button 
                type="button" 
                (click)="openRegisterOfficerModal(selectedDeptForAddOfficer)" 
                [disabled]="isAssigningOfficers()"
                class="px-3 py-2 bg-[#0F172A] text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow-xs inline-flex items-center space-x-1.5 disabled:opacity-50"
                title="Register a new officer"
              >
                <app-icon name="user-plus" size="w-3.5 h-3.5"></app-icon>
                <span>Register Officer</span>
              </button>
            </div>
          </div>

          <div *ngIf="getAvailableOfficersForAssignment().length > 0 && getFilteredAvailableOfficers().length === 0" class="text-xs text-slate-500 italic p-4 text-center bg-slate-50 border border-slate-200 rounded-2xl">
            No officers found matching the selected department filter or search criteria.
          </div>

          <div class="flex space-x-2 pt-2 border-t">
            <button (click)="isQuickAddOfficerModalOpen.set(false)" [disabled]="isAssigningOfficers()" class="flex-1 bg-slate-100 py-2.5 rounded-xl text-xs font-bold text-slate-600 disabled:opacity-50">Cancel</button>
            <button 
              (click)="submitAddOfficers()" 
              [disabled]="selectedOfficerIdsForAdd.size === 0 || isAssigningOfficers()" 
              class="flex-1 bg-[#0F172A] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center space-x-1.5 min-h-[40px] min-w-[200px]"
            >
              <app-icon *ngIf="isAssigningOfficers()" name="loader" size="w-3.5 h-3.5" class="animate-spin shrink-0"></app-icon>
              <span>{{ isAssigningOfficers() ? (hasTransfersSelected() ? 'Transferring...' : (selectedOfficerIdsForAdd.size === 1 ? 'Adding Officer...' : 'Adding Officers...')) : ('Assign (' + selectedOfficerIdsForAdd.size + ') Selected Officer' + (selectedOfficerIdsForAdd.size === 1 ? '' : 's')) }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Register Officer Modal (Layer: z-[60] so it stacks over Assign Officers Modal) -->
      <div *ngIf="isRegisterOfficerModalOpen()" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
        <div class="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-modal-pop max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center border-b pb-3">
            <h3 class="font-bold text-lg text-slate-900">Register Officer</h3>
            <button (click)="isRegisterOfficerModalOpen.set(false)" [disabled]="isRegisteringOfficer()" aria-label="Close modal" class="text-slate-400 hover:text-slate-600 transition disabled:opacity-50">
              <app-icon name="x" size="w-5 h-5"></app-icon>
            </button>
          </div>

          <form (submit)="promptRegisterOfficer()" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name *</label>
              <input type="text" [ngModel]="newOfficer.name" (ngModelChange)="onNewOfficerNameChange($event)" name="reg_sec_name" required autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" placeholder="Enter full name" class="w-full px-3 py-2 border rounded-xl text-xs" />
              <p *ngIf="hasRegisterSubmitted() && !newOfficer.name.trim()" class="text-[11px] text-rose-600 font-bold mt-1">Please fill out all required fields.</p>
              <p *ngIf="hasRegisterSubmitted() && isNameNumericInvalid(newOfficer.name)" class="text-[11px] text-rose-600 font-bold mt-1">Names can not be in number</p>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Official Email Address *</label>
              <input type="email" [(ngModel)]="newOfficer.email" name="reg_sec_email" required autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" placeholder="officer@sikkim.gov.in" class="w-full px-3 py-2 border rounded-xl text-xs" />
              <p *ngIf="hasRegisterSubmitted() && !newOfficer.email.trim()" class="text-[11px] text-rose-600 font-bold mt-1">Please fill out all required fields.</p>
              <p *ngIf="hasRegisterSubmitted() && newOfficer.email.trim() && !isEmailValid(newOfficer.email)" class="text-[11px] text-rose-600 font-bold mt-1">Invalid email format.</p>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Create Password *</label>
                <div class="relative">
                  <input 
                    [type]="showOfficerPassword() ? 'text' : 'password'" 
                    [(ngModel)]="newOfficer.password" 
                    name="reg_sec_pass" 
                    required 
                    autocomplete="one-time-code"
                    autocorrect="off"
                    autocapitalize="off"
                    spellcheck="false"
                    data-lpignore="true"
                    placeholder="••••••••" 
                    class="w-full px-3 py-2 pr-10 border rounded-xl text-xs font-mono" 
                  />
                  <button 
                    type="button" 
                    (click)="showOfficerPassword.set(!showOfficerPassword())" 
                    aria-label="Toggle officer password visibility"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1 focus:outline-none"
                  >
                    {{ showOfficerPassword() ? 'Hide' : 'Show' }}
                  </button>
                </div>
                <p *ngIf="hasRegisterSubmitted() && !newOfficer.password.trim()" class="text-[11px] text-rose-600 font-bold mt-1">Please fill out all required fields.</p>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Confirm Password *</label>
                <div class="relative">
                  <input 
                    [type]="showOfficerConfirmPassword() ? 'text' : 'password'" 
                    [(ngModel)]="newOfficer.confirmPassword" 
                    name="reg_confirm_sec_pass" 
                    required 
                    autocomplete="one-time-code"
                    autocorrect="off"
                    autocapitalize="off"
                    spellcheck="false"
                    data-lpignore="true"
                    placeholder="••••••••" 
                    class="w-full px-3 py-2 pr-10 border rounded-xl text-xs font-mono" 
                  />
                  <button 
                    type="button" 
                    (click)="showOfficerConfirmPassword.set(!showOfficerConfirmPassword())" 
                    aria-label="Toggle confirm password visibility"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1 focus:outline-none"
                  >
                    {{ showOfficerConfirmPassword() ? 'Hide' : 'Show' }}
                  </button>
                </div>
                <p *ngIf="hasRegisterSubmitted() && !newOfficer.confirmPassword.trim()" class="text-[11px] text-rose-600 font-bold mt-1">Please fill out all required fields.</p>
                <p *ngIf="hasRegisterSubmitted() && newOfficer.password.trim() && newOfficer.confirmPassword.trim() && newOfficer.password !== newOfficer.confirmPassword" class="text-[11px] text-rose-600 font-bold mt-1">Passwords do not match.</p>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Assign Target Department</label>
              <select [(ngModel)]="newOfficer.departmentId" name="sec_dept_assign_val" class="w-full px-3 py-2 border rounded-xl text-xs bg-white font-bold">
                <option value="">Leave Unassigned for now</option>
                <option *ngFor="let d of departmentService.departments()" [value]="d.id">
                  {{ d.name }} ({{ d.code }})
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Contact Phone</label>
              <input type="text" [ngModel]="newOfficer.phone" (ngModelChange)="onNewOfficerPhoneChange($event)" name="sec_off_ph_val" autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" placeholder="Enter mobile number" class="w-full px-3 py-2 border rounded-xl text-xs" />
              <p *ngIf="hasRegisterSubmitted() && newOfficer.phone.trim() && isPhoneTextInvalid(newOfficer.phone)" class="text-[11px] text-rose-600 font-bold mt-1">Enter phone number</p>
            </div>

            <div class="flex space-x-3 pt-4 border-t">
              <button type="button" [disabled]="isRegisteringOfficer()" (click)="isRegisterOfficerModalOpen.set(false)" class="flex-1 bg-slate-100 py-3 rounded-xl text-xs font-bold text-slate-600 disabled:opacity-50">Cancel</button>
              <button 
                type="submit" 
                [disabled]="isRegisteringOfficer()"
                class="flex-1 bg-[#0F172A] text-white py-3 rounded-xl text-xs font-extrabold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center space-x-1.5 min-h-[44px] min-w-[150px]"
              >
                <app-icon *ngIf="isRegisteringOfficer()" name="loader" size="w-4 h-4" class="animate-spin shrink-0"></app-icon>
                <span>{{ isRegisteringOfficer() ? 'Registering...' : 'Register Officer' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Action Confirmation Dialog (Layer: z-[70]) -->
      <div *ngIf="confirmationModal()" class="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
        <div class="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-modal-pop">
          <div class="flex justify-between items-center border-b pb-3">
            <h3 class="font-bold text-base text-slate-900">{{ confirmationModal()?.title }}</h3>
            <button (click)="confirmationModal.set(null)" [disabled]="isConfirmingAction()" aria-label="Close dialog" class="text-slate-400 hover:text-slate-600 transition disabled:opacity-50">
              <app-icon name="x" size="w-5 h-5"></app-icon>
            </button>
          </div>
          <p class="text-xs text-slate-600">{{ confirmationModal()?.message }}</p>
          <div class="flex space-x-2 pt-3 border-t">
            <button (click)="confirmationModal.set(null)" [disabled]="isConfirmingAction()" class="flex-1 bg-slate-100 py-2.5 rounded-xl text-xs font-bold text-slate-600 disabled:opacity-50">
              Cancel
            </button>
            <button 
              (click)="executeConfirmedAction()" 
              [disabled]="isConfirmingAction()"
              [class]="confirmationModal()?.isDestructive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#0F172A] hover:bg-slate-800'"
              class="flex-1 text-white py-2.5 rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1.5 min-h-[40px] min-w-[140px]"
            >
              <app-icon *ngIf="isConfirmingAction()" name="loader" size="w-3.5 h-3.5" class="animate-spin shrink-0"></app-icon>
              <span>{{ isConfirmingAction() ? (confirmationModal()?.loadingText || 'Processing...') : (confirmationModal()?.confirmBtnText || 'Confirm') }}</span>
            </button>
          </div>
        </div>
      </div>

      <app-toast [message]="toastMessage()" (dismiss)="toastMessage.set(null)"></app-toast>

    </div>
  `
})
export class DepartmentManagementComponent {
  departmentService = inject(DepartmentService);
  authService = inject(AuthService);

  isModalOpen = signal<boolean>(false);
  isQuickAddOfficerModalOpen = signal<boolean>(false);
  hasSubmitted = signal<boolean>(false);
  toastMessage = signal<string | null>(null);

  isSavingDept = signal<boolean>(false);
  isAssigningOfficers = signal<boolean>(false);
  isConfirmingAction = signal<boolean>(false);
  togglingDeptId = signal<string | null>(null);
  activeActionDeptOfficerId = signal<string | null>(null);
  deletingDeptId = signal<string | null>(null);

  isRegisterOfficerModalOpen = signal<boolean>(false);
  isRegisteringOfficer = signal<boolean>(false);
  hasRegisterSubmitted = signal<boolean>(false);
  showOfficerPassword = signal<boolean>(false);
  showOfficerConfirmPassword = signal<boolean>(false);

  newOfficer = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    departmentId: '',
    phone: '',
    designation: 'Officer'
  };

  editingDeptId: string | null = null;
  selectedDeptForAddOfficer: Department | null = null;

  selectedOfficerIdForForm = '';
  quickSelectedOfficerId = '';

  deptForm = {
    name: '',
    code: '',
    description: '',
    contactPhone: '',
    contactEmail: '',
    isActive: true,
    assignedOfficers: [] as any[]
  };

  onDeptNameChange(val: string) {
    this.deptForm.name = capitalizeFirstChar(val);
  }

  getUnassignedRegisteredOfficers() {
    const depts = this.departmentService.departments();
    const currentFormOfficerIds = this.deptForm.assignedOfficers.map(o => o.id);
    const currentFormOfficerEmails = this.deptForm.assignedOfficers.map(o => o.email.toLowerCase());

    return this.authService.registeredOfficers().filter(off => {
      if (currentFormOfficerIds.includes(off.id) || currentFormOfficerEmails.includes(off.email.toLowerCase())) {
        return false;
      }
      const isAssignedToOtherDept = depts.some(d => 
        d.id !== this.editingDeptId && d.assignedOfficers?.some(o => o.id === off.id || o.email.toLowerCase() === off.email.toLowerCase())
      );
      const isUnassignedState = !off.departmentId || off.departmentId === '' || off.departmentName === 'Unassigned';
      return isUnassignedState && !isAssignedToOtherDept;
    });
  }

  openCreateModal() {
    this.editingDeptId = null;
    this.selectedOfficerIdForForm = '';
    this.hasSubmitted.set(false);
    this.deptForm = {
      name: '',
      code: '',
      description: '',
      contactPhone: '',
      contactEmail: '',
      isActive: true,
      assignedOfficers: []
    };
    this.isModalOpen.set(true);
  }

  openEditModal(dept: Department) {
    this.editingDeptId = dept.id;
    this.selectedOfficerIdForForm = '';
    this.hasSubmitted.set(false);
    this.deptForm = {
      name: dept.name,
      code: dept.code,
      description: dept.description,
      contactPhone: dept.contactPhone,
      contactEmail: dept.contactEmail,
      isActive: dept.isActive,
      assignedOfficers: dept.assignedOfficers ? [...dept.assignedOfficers] : []
    };
    this.isModalOpen.set(true);
  }

  addSelectedOfficerToForm() {
    if (!this.selectedOfficerIdForForm) return;

    const registered = this.authService.registeredOfficers().find(o => o.id === this.selectedOfficerIdForForm);
    if (!registered) return;

    // Check if already in current form list
    if (this.deptForm.assignedOfficers.some(o => o.id === registered.id || o.email.toLowerCase() === registered.email.toLowerCase())) {
      this.toastMessage.set(`Officer "${registered.name}" is already in this department list.`);
      return;
    }

    // Check if officer is assigned to another department
    const existingDept = this.departmentService.departments().find(d => 
      d.id !== this.editingDeptId && d.assignedOfficers?.some(o => o.id === registered.id || o.email.toLowerCase() === registered.email.toLowerCase())
    );

    if (existingDept) {
      this.toastMessage.set(`Note: Officer "${registered.name}" will be reassigned from "${existingDept.name}" (one officer can only belong to one department).`);
    }

    this.deptForm.assignedOfficers.push({
      id: registered.id,
      name: registered.name,
      email: registered.email,
      designation: registered.designation || 'Officer',
      phone: registered.phone
    });

    this.selectedOfficerIdForForm = '';
  }

  removeOfficerFromForm(index: number) {
    this.deptForm.assignedOfficers.splice(index, 1);
  }

  selectedOfficerIdsForAdd = new Set<string>();
  addOfficerDeptFilter = 'ALL';
  addOfficerSearchKeyword = '';

  onAddOfficerSearchChange(val: string) {
    this.addOfficerSearchKeyword = val;
  }

  getOfficerCurrentDepartment(off: any): Department | undefined {
    // 1. Check if officer is listed in any active department's assignedOfficers array
    const assignedDept = this.departmentService.departments().find(d =>
      d.assignedOfficers?.some(o => o.id === off.id || (o.email && off.email && o.email.toLowerCase() === off.email.toLowerCase()))
    );
    if (assignedDept) return assignedDept;

    // 2. Check if officer has departmentId matching a department
    if (off.departmentId && off.departmentId !== 'Unassigned') {
      const deptById = this.departmentService.departments().find(d => d.id === off.departmentId);
      if (deptById) return deptById;
    }

    // 3. Check if officer has departmentName matching a department
    if (off.departmentName && off.departmentName !== 'Unassigned') {
      const deptByName = this.departmentService.departments().find(d => d.name.toLowerCase() === off.departmentName.toLowerCase());
      if (deptByName) return deptByName;
    }

    return undefined;
  }

  getOfficerDepartmentName(off: any): string {
    const dept = this.getOfficerCurrentDepartment(off);
    if (dept) return dept.name;
    if (off.departmentName && off.departmentName !== 'Unassigned') return off.departmentName;
    return 'Unassigned';
  }

  getAvailableOfficersForAssignment() {
    if (!this.selectedDeptForAddOfficer) return [];
    const targetDeptId = this.selectedDeptForAddOfficer.id;
    const currentAssigned = this.selectedDeptForAddOfficer.assignedOfficers || [];
    const currentAssignedIds = new Set(currentAssigned.map((o: any) => o.id));
    const currentAssignedEmails = new Set(currentAssigned.map((o: any) => (o.email || '').toLowerCase()));

    // Return non-revoked officers that are not already assigned to this target department
    return this.authService.registeredOfficers().filter(off => {
      if (off.isRevoked) return false;
      if (currentAssignedIds.has(off.id)) return false;
      if (off.email && currentAssignedEmails.has(off.email.toLowerCase())) return false;
      // Also check if officer's departmentId is already targetDeptId
      if (off.departmentId === targetDeptId) return false;
      return true;
    });
  }

  getFilteredAvailableOfficers() {
    const available = this.getAvailableOfficersForAssignment();

    return available.filter(off => {
      // 1. Department filter
      if (this.addOfficerDeptFilter !== 'ALL') {
        if (this.addOfficerDeptFilter === 'UNASSIGNED') {
          if (!this.isOfficerUnassigned(off)) {
            return false;
          }
        } else {
          // Specific department ID selected
          const currentDept = this.getOfficerCurrentDepartment(off);
          const filterDept = this.departmentService.departments().find(d => d.id === this.addOfficerDeptFilter);
          const filterDeptName = filterDept?.name?.toLowerCase();

          const matchesId = currentDept?.id === this.addOfficerDeptFilter || off.departmentId === this.addOfficerDeptFilter;
          const matchesName = (currentDept && filterDeptName && currentDept.name.toLowerCase() === filterDeptName) ||
                              (off.departmentName && filterDeptName && off.departmentName.toLowerCase() === filterDeptName);

          if (!matchesId && !matchesName) {
            return false;
          }
        }
      }

      // 2. Search keyword filter (works together with department filter)
      if (this.addOfficerSearchKeyword.trim()) {
        const kw = this.addOfficerSearchKeyword.trim().toLowerCase();
        const matchesName = off.name && off.name.toLowerCase().includes(kw);
        const matchesCode = (off.userCode && off.userCode.toLowerCase().includes(kw)) ||
                            (off.officerCode && off.officerCode.toLowerCase().includes(kw)) ||
                            (off.id && off.id.toLowerCase().includes(kw));
        const matchesEmail = off.email && off.email.toLowerCase().includes(kw);
        const matchesPhone = off.phone && off.phone.toLowerCase().includes(kw);

        if (!matchesName && !matchesCode && !matchesEmail && !matchesPhone) {
          return false;
        }
      }

      return true;
    });
  }

  isOfficerUnassigned(off: any): boolean {
    return !this.getOfficerCurrentDepartment(off);
  }

  isOfficerSelected(officerId: string): boolean {
    return this.selectedOfficerIdsForAdd.has(officerId);
  }

  hasTransfersSelected(): boolean {
    const available = this.getAvailableOfficersForAssignment();
    return Array.from(this.selectedOfficerIdsForAdd).some(id => {
      const off = available.find(o => o.id === id);
      return off && !this.isOfficerUnassigned(off);
    });
  }

  toggleOfficerSelection(officerId: string) {
    if (this.selectedOfficerIdsForAdd.has(officerId)) {
      this.selectedOfficerIdsForAdd.delete(officerId);
    } else {
      this.selectedOfficerIdsForAdd.add(officerId);
    }
  }

  isAllSelected(): boolean {
    const available = this.getFilteredAvailableOfficers();
    return available.length > 0 && available.every(off => this.selectedOfficerIdsForAdd.has(off.id));
  }

  toggleSelectAll() {
    const available = this.getFilteredAvailableOfficers();
    if (this.isAllSelected()) {
      available.forEach(off => this.selectedOfficerIdsForAdd.delete(off.id));
    } else {
      available.forEach(off => this.selectedOfficerIdsForAdd.add(off.id));
    }
  }

  openQuickAddOfficerModal(dept: Department) {
    this.selectedDeptForAddOfficer = dept;
    this.selectedOfficerIdsForAdd.clear();
    this.addOfficerDeptFilter = 'ALL';
    this.addOfficerSearchKeyword = '';
    this.isQuickAddOfficerModalOpen.set(true);
  }

  async submitAddOfficers() {
    if (!this.selectedDeptForAddOfficer || this.selectedOfficerIdsForAdd.size === 0 || this.isAssigningOfficers()) return;

    const officerIds = Array.from(this.selectedOfficerIdsForAdd);
    const deptId = this.selectedDeptForAddOfficer.id;
    const deptName = this.selectedDeptForAddOfficer.name;

    this.isAssigningOfficers.set(true);
    try {
      await this.departmentService.assignMultipleOfficersToDepartment(deptId, officerIds);
      // Reload grievances so assignment status/redistribution synchronizes
      await this.grievanceService.loadGrievancesFromBackend();

      this.toastMessage.set(`Successfully assigned ${officerIds.length} officer(s) to ${deptName}.`);
      this.isQuickAddOfficerModalOpen.set(false);
      this.selectedOfficerIdsForAdd.clear();
    } catch (err: any) {
      this.toastMessage.set(err.message || 'Failed to assign officers.');
    } finally {
      this.isAssigningOfficers.set(false);
    }
  }

  async removeOfficerFromDept(deptId: string, officerId: string) {
    try {
      const dept = this.departmentService.departments().find(d => d.id === deptId);
      const targetOfficer = dept?.assignedOfficers?.find(o => o.id === officerId);

      await this.departmentService.removeOfficerFromDepartment(deptId, officerId);
      // Reload grievances to sync redistributed tickets immediately
      await this.grievanceService.loadGrievancesFromBackend();

      this.toastMessage.set(`Officer "${targetOfficer?.name || officerId}" removed from department. Active cases redistributed.`);
    } catch (err: any) {
      this.toastMessage.set(err.message || 'Action failed.');
    }
  }

  onDeptPhoneChange(val: string) {
    this.deptForm.contactPhone = val;
  }

  isNameAndCodeSame(): boolean {
    const cleanName = (this.deptForm.name || '').trim().toLowerCase();
    const cleanCode = (this.deptForm.code || '').trim().toLowerCase();
    return !!cleanName && !!cleanCode && cleanName === cleanCode;
  }

  isNameNumericInvalid(val: string): boolean {
    if (!val.trim()) return false;
    return /\d/.test(val);
  }

  isEmailValid(val: string): boolean {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val.trim());
  }

  isPhoneTextInvalid(val: string): boolean {
    return isPhoneTextInvalid(val);
  }

  openRegisterOfficerModal(dept?: Department | null) {
    this.hasRegisterSubmitted.set(false);
    this.showOfficerPassword.set(false);
    this.showOfficerConfirmPassword.set(false);
    const defaultDept = dept?.id || this.selectedDeptForAddOfficer?.id || (this.editingDeptId || '');
    this.newOfficer = {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      departmentId: defaultDept,
      phone: '',
      designation: 'Officer'
    };
    this.isRegisterOfficerModalOpen.set(true);
  }

  onNewOfficerNameChange(val: string) {
    this.newOfficer.name = capitalizeFirstChar(val);
  }

  onNewOfficerPhoneChange(val: string) {
    this.newOfficer.phone = val;
  }

  async promptRegisterOfficer() {
    if (this.isRegisteringOfficer()) return;
    this.hasRegisterSubmitted.set(true);

    if (!this.newOfficer.name.trim() || !this.newOfficer.email.trim()) {
      this.toastMessage.set('Please fill out all required fields.');
      return;
    }

    if (this.isNameNumericInvalid(this.newOfficer.name)) {
      this.toastMessage.set('Names can not be in number');
      return;
    }

    if (!this.isEmailValid(this.newOfficer.email)) {
      this.toastMessage.set('Invalid email format. Please enter a valid officer email address (e.g. officer@sikkim.gov.in).');
      return;
    }

    if (this.newOfficer.phone.trim() && this.isPhoneTextInvalid(this.newOfficer.phone)) {
      this.toastMessage.set('Enter phone number');
      return;
    }

    if (!this.newOfficer.password.trim() || !this.newOfficer.confirmPassword.trim()) {
      this.toastMessage.set('Password is required for new registration.');
      return;
    }

    if (this.newOfficer.password !== this.newOfficer.confirmPassword) {
      this.toastMessage.set('Passwords do not match. Please verify.');
      return;
    }

    this.isRegisteringOfficer.set(true);
    const isUnassigned = !this.newOfficer.departmentId || this.newOfficer.departmentId === 'unassigned' || this.newOfficer.departmentId === '';
    const dept = isUnassigned ? null : this.departmentService.departments().find(d => d.id === this.newOfficer.departmentId);
    const deptId = dept ? dept.id : '';
    const deptName = dept ? dept.name : 'Unassigned';
    const formattedPhone = formatPhoneNumber(this.newOfficer.phone);

    try {
      const createdOfficer = await this.authService.registerOfficerByAdmin({
        name: this.newOfficer.name.trim(),
        email: this.newOfficer.email.trim(),
        password: this.newOfficer.password.trim(),
        designation: 'Officer',
        departmentId: deptId,
        departmentName: deptName,
        phone: formattedPhone
      });

      await this.departmentService.loadDepartmentsFromBackend();
      await this.grievanceService.loadGrievancesFromBackend();

      // Refresh currently selected department
      if (this.selectedDeptForAddOfficer) {
        const refreshedDept = this.departmentService.departments().find(d => d.id === this.selectedDeptForAddOfficer!.id);
        if (refreshedDept) {
          this.selectedDeptForAddOfficer = refreshedDept;
        }
      }

      // If Create/Edit Department modal is currently open, sync to deptForm.assignedOfficers
      if (this.isModalOpen() && createdOfficer && createdOfficer.id) {
        if (!this.deptForm.assignedOfficers.some(o => o.id === createdOfficer.id || o.email.toLowerCase() === createdOfficer.email.toLowerCase())) {
          if (!createdOfficer.departmentId || createdOfficer.departmentId === this.editingDeptId) {
            this.deptForm.assignedOfficers.push({
              id: createdOfficer.id,
              name: createdOfficer.name,
              email: createdOfficer.email,
              designation: createdOfficer.designation || 'Officer',
              phone: createdOfficer.phone
            });
          }
        }
      }

      // If registered unassigned, select the officer and clear search so they are immediately visible in the list
      if (createdOfficer && createdOfficer.id) {
        this.addOfficerSearchKeyword = '';
        if (isUnassigned) {
          this.selectedOfficerIdsForAdd.add(createdOfficer.id);
        }
      }

      this.toastMessage.set(`Officer "${this.newOfficer.name}" registered successfully! Access granted.`);
      this.isRegisterOfficerModalOpen.set(false);
      this.newOfficer = { name: '', email: '', password: '', confirmPassword: '', departmentId: '', phone: '', designation: 'Officer' };
    } catch (err: any) {
      this.toastMessage.set(err.message || 'Registration failed.');
    } finally {
      this.isRegisteringOfficer.set(false);
    }
  }

  confirmationModal = signal<{
    title: string;
    message: string;
    confirmBtnText: string;
    loadingText?: string;
    isDestructive?: boolean;
    action: () => Promise<void>;
  } | null>(null);

  confirmRemoveOfficer(deptId: string, officerId: string, officerName: string) {
    this.confirmationModal.set({
      title: 'Remove Officer from Department',
      message: `Are you sure you want to remove "${officerName}" from this department? The officer will become Unassigned.`,
      confirmBtnText: 'Yes, Remove',
      loadingText: 'Removing...',
      isDestructive: true,
      action: async () => {
        this.activeActionDeptOfficerId.set(deptId + '_' + officerId);
        try {
          await this.removeOfficerFromDept(deptId, officerId);
        } finally {
          this.activeActionDeptOfficerId.set(null);
        }
      }
    });
  }

  confirmDeleteDepartment(id: string, name: string) {
    this.confirmationModal.set({
      title: 'Delete Department',
      message: `Are you sure you want to delete department "${name}"? Solved grievances will be preserved, and open cases will be moved to unassigned tickets.`,
      confirmBtnText: 'Yes, Delete',
      loadingText: 'Deleting...',
      isDestructive: true,
      action: async () => {
        this.deletingDeptId.set(id);
        try {
          await this.deleteDepartment(id, name);
        } finally {
          this.deletingDeptId.set(null);
        }
      }
    });
  }

  promptSaveDepartment() {
    this.hasSubmitted.set(true);
    if (!this.deptForm.name.trim() || !this.deptForm.code.trim() || !this.deptForm.description.trim() || !this.deptForm.contactPhone.trim() || !this.deptForm.contactEmail.trim()) {
      this.toastMessage.set('Please fill out all required fields.');
      return;
    }

    if (this.isNameAndCodeSame()) {
      this.toastMessage.set('Department Name and Department Code / ID should not be the same.');
      return;
    }

    if (this.isNameNumericInvalid(this.deptForm.name)) {
      this.toastMessage.set('Names can not be in number');
      return;
    }

    if (!this.isEmailValid(this.deptForm.contactEmail)) {
      this.toastMessage.set('Invalid official email format. Please enter a valid email address (e.g. dept@sikkim.gov.in).');
      return;
    }

    if (this.isPhoneTextInvalid(this.deptForm.contactPhone)) {
      this.toastMessage.set('Enter phone number');
      return;
    }

    if (this.editingDeptId) {
      this.confirmationModal.set({
        title: 'Save Changes Confirmation',
        message: `Are you sure you want to save these changes for department "${this.deptForm.name}"?`,
        confirmBtnText: 'Yes, Save Changes',
        loadingText: 'Saving...',
        isDestructive: false,
        action: async () => {
          await this.executeSaveDepartment();
        }
      });
    } else {
      this.executeSaveDepartment();
    }
  }

  async executeConfirmedAction() {
    const modal = this.confirmationModal();
    if (!modal || !modal.action || this.isConfirmingAction()) return;
    this.isConfirmingAction.set(true);
    try {
      await modal.action();
      this.confirmationModal.set(null);
    } catch (e: any) {
      this.toastMessage.set(e?.message || 'Operation failed');
    } finally {
      this.isConfirmingAction.set(false);
    }
  }

  async executeSaveDepartment() {
    if (this.isSavingDept()) return;
    this.isSavingDept.set(true);
    try {
      if (this.editingDeptId) {
        await this.departmentService.updateDepartment(this.editingDeptId, this.deptForm);
        this.toastMessage.set(`Department updated successfully.`);
      } else {
        await this.departmentService.createDepartment(this.deptForm);
        this.toastMessage.set(`New department created successfully.`);
      }
      this.isModalOpen.set(false);
    } catch (err: any) {
      this.toastMessage.set(err.message || 'Error executing action');
    } finally {
      this.isSavingDept.set(false);
    }
  }

  async toggleStatus(id: string) {
    if (this.togglingDeptId()) return;
    this.togglingDeptId.set(id);
    try {
      await this.departmentService.toggleDepartmentStatus(id);
      this.toastMessage.set(`Department status updated.`);
    } catch (err: any) {
      this.toastMessage.set(err?.message || 'Failed to update department status.');
    } finally {
      this.togglingDeptId.set(null);
    }
  }

  grievanceService = inject(GrievanceService);

  async deleteDepartment(id: string, name: string) {
    try {
      await this.departmentService.deleteDepartment(id);
      this.toastMessage.set(`Department "${name}" deleted successfully.`);
    } catch (err: any) {
      this.toastMessage.set(err.message || 'Failed to delete department.');
    }
  }
}
