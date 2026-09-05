import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DepartmentService } from '../../core/services/department.service';
import { AuthService } from '../../core/services/auth.service';
import { GrievanceService } from '../../core/services/grievance.service';
import { Department } from '../../core/models/department.model';
import { ToastComponent } from '../../common/components/toast.component';
import { isPhoneTextInvalid } from '../../core/models/user.model';
import { capitalizeFirstChar } from '../../core/directives/capitalize-first.directive';

@Component({
  selector: 'app-department-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <!-- Top Title Header -->
      <div class="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div class="inline-flex items-center space-x-2 px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-xs font-bold uppercase mb-1">
            <span>Directorate Admin Panel</span>
          </div>
          <h1 class="text-2xl font-extrabold text-slate-900">Department Directory & Officers</h1>
          <p class="text-xs text-slate-500">Configure Directorate Departments and assign Officers from the registered officers</p>
        </div>

        <button (click)="openCreateModal()" class="px-5 py-2.5 bg-[#0F172A] text-white rounded-xl text-xs font-extrabold hover:bg-slate-800 shadow-lg flex items-center space-x-2">
          <span>Create New Department</span>
        </button>
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
                [class.bg-emerald-100]="dept.isActive"
                [class.text-emerald-800]="dept.isActive"
                [class.bg-rose-100]="!dept.isActive"
                [class.text-rose-800]="!dept.isActive"
                class="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase transition"
              >
                {{ dept.isActive ? 'Active' : 'Inactive' }}
              </button>
            </div>

            <p class="text-xs text-slate-600 line-clamp-2">{{ dept.description }}</p>

            <div class="text-xs space-y-1 text-slate-500 font-mono bg-slate-50 p-3 rounded-xl">
              <p>Phone: <span class="font-bold text-slate-800">{{ dept.contactPhone }}</span></p>
              <p>Email: <span class="font-bold text-slate-800 truncate">{{ dept.contactEmail }}</span></p>
            </div>
          </div>

          <!-- Multiple Assigned Officers Box -->
          <div class="space-y-2 border-t pt-3">
            <div class="flex justify-between items-center">
              <span class="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">Assigned Officers ({{ dept.assignedOfficers?.length || 0 }})</span>
              <button (click)="openQuickAddOfficerModal(dept)" class="text-[11px] font-extrabold text-teal-700 hover:underline">
                + Add Officer
              </button>
            </div>

            <div *ngIf="dept.assignedOfficers && dept.assignedOfficers.length > 0" class="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              <div *ngFor="let off of dept.assignedOfficers" class="flex items-center justify-between p-2 bg-slate-50 rounded-xl text-xs border border-slate-200">
                <div class="truncate pr-2">
                  <p class="font-bold text-slate-900 truncate">{{ off.name }}</p>
                  <p class="text-[10px] text-slate-500 font-mono truncate">{{ off.email }}</p>
                </div>
                <button (click)="confirmRemoveOfficer(dept.id, off.id, off.name)" title="Remove Officer from Department" class="text-rose-600 font-bold px-1.5 py-0.5 hover:bg-rose-100 rounded text-xs">
                  ✕
                </button>
              </div>
            </div>

            <div *ngIf="!dept.assignedOfficers || dept.assignedOfficers.length === 0" class="text-xs text-slate-400 italic p-2 bg-slate-50 rounded-xl">
              No Officers assigned yet.
            </div>
          </div>

          <div class="pt-3 border-t flex space-x-2">
            <button (click)="openEditModal(dept)" class="flex-1 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200">
              Edit Dept
            </button>
            <button (click)="confirmDeleteDepartment(dept.id, dept.name)" class="px-3 py-2 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold hover:bg-rose-100">
              Delete
            </button>
          </div>

        </div>
      </div>

      <!-- Create / Edit Department Modal -->
      <div *ngIf="isModalOpen()" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div class="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center border-b pb-3">
            <h3 class="font-bold text-lg text-slate-900">{{ editingDeptId ? 'Edit Department' : 'Create New Department' }}</h3>
            <button (click)="isModalOpen.set(false)" aria-label="Close modal" class="text-slate-400 hover:text-slate-600 transition">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
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
                <span class="text-[10px] text-slate-500">Total: {{ deptForm.assignedOfficers.length }}</span>
              </div>

              <!-- List of Added Officers -->
              <div *ngIf="deptForm.assignedOfficers.length > 0" class="space-y-1.5">
                <div *ngFor="let off of deptForm.assignedOfficers; let i = index" class="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span class="font-bold text-slate-900">{{ off.name }}</span>
                    <span class="text-slate-500 text-[11px] ml-1 font-mono">({{ off.email }})</span>
                  </div>
                  <button type="button" (click)="removeOfficerFromForm(i)" class="text-rose-600 font-bold px-2 py-0.5 hover:bg-rose-50 rounded text-xs flex items-center space-x-1">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
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
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Assign Selected Officer</span>
                  </button>
                </div>

                <div *ngIf="getUnassignedRegisteredOfficers().length === 0" class="text-xs text-amber-800 italic p-2 bg-amber-50 border border-amber-200 rounded-xl">
                  No unassigned officers available. All registered officers are already assigned to operational departments.
                </div>
              </div>
            </div>

            <div class="flex space-x-3 pt-4 border-t">
              <button type="button" (click)="isModalOpen.set(false)" class="flex-1 bg-slate-100 py-3 rounded-xl text-xs font-bold text-slate-600">Cancel</button>
              <button type="submit" class="flex-1 bg-[#0F172A] text-white py-3 rounded-xl text-xs font-extrabold hover:bg-slate-800">
                {{ editingDeptId ? 'Update Department' : 'Save Department' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Quick Add Officer Modal (Select from Unassigned Registered Officers) -->
      <div *ngIf="isQuickAddOfficerModalOpen()" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div class="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in relative">
          <div class="flex justify-between items-center border-b pb-3">
            <h3 class="font-bold text-base text-slate-900">Assign Officer to {{ selectedDeptForAddOfficer?.name }}</h3>
            <button (click)="isQuickAddOfficerModalOpen.set(false)" aria-label="Close modal" class="text-slate-400 hover:text-slate-600 transition">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p class="text-xs text-slate-500">Select an unassigned registered officer to assign exclusively to this department.</p>

          <div *ngIf="getUnassignedRegisteredOfficers().length > 0" class="space-y-3 text-xs">
            <div>
              <label class="block font-bold text-slate-700 uppercase mb-1">Select Unassigned Registered Officer *</label>
              <select [(ngModel)]="quickSelectedOfficerId" class="w-full px-3 py-2 border rounded-xl font-bold text-xs bg-white">
                <option value="">Select an unassigned officer...</option>
                <option *ngFor="let off of getUnassignedRegisteredOfficers()" [value]="off.id">
                  {{ off.name }} ({{ off.email }})
                </option>
              </select>
            </div>
          </div>

          <div *ngIf="getUnassignedRegisteredOfficers().length === 0" class="text-xs text-amber-800 italic p-3 bg-amber-50 border border-amber-200 rounded-xl">
            No unassigned officers available. All registered officers are currently assigned to operational departments.
          </div>

          <div class="flex space-x-2 pt-2 border-t">
            <button (click)="isQuickAddOfficerModalOpen.set(false)" class="flex-1 bg-slate-100 py-2.5 rounded-xl text-xs font-bold text-slate-600">Cancel</button>
            <button (click)="submitQuickAddOfficer()" [disabled]="!quickSelectedOfficerId" class="flex-1 bg-[#0F172A] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 disabled:opacity-50">Assign Selected Officer</button>
          </div>
        </div>
      </div>

      <!-- Action Confirmation Dialog (Layer: z-[70]) -->
      <div *ngIf="confirmationModal()" class="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 animate-fade-in">
        <div class="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
          <div class="flex justify-between items-center border-b pb-3">
            <h3 class="font-bold text-base text-slate-900">{{ confirmationModal()?.title }}</h3>
            <button (click)="confirmationModal.set(null)" aria-label="Close dialog" class="text-slate-400 hover:text-slate-600 transition">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p class="text-xs text-slate-600">{{ confirmationModal()?.message }}</p>
          <div class="flex space-x-2 pt-3 border-t">
            <button (click)="confirmationModal.set(null)" class="flex-1 bg-slate-100 py-2.5 rounded-xl text-xs font-bold text-slate-600">
              Cancel
            </button>
            <button 
              (click)="executeConfirmedAction()" 
              [class]="confirmationModal()?.isDestructive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#0F172A] hover:bg-slate-800'"
              class="flex-1 text-white py-2.5 rounded-xl text-xs font-bold transition shadow-sm"
            >
              {{ confirmationModal()?.confirmBtnText || 'Confirm' }}
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

  openQuickAddOfficerModal(dept: Department) {
    this.selectedDeptForAddOfficer = dept;
    this.quickSelectedOfficerId = '';
    this.isQuickAddOfficerModalOpen.set(true);
  }

  async submitQuickAddOfficer() {
    if (!this.selectedDeptForAddOfficer || !this.quickSelectedOfficerId) return;

    const registered = this.authService.registeredOfficers().find(o => o.id === this.quickSelectedOfficerId);
    if (!registered) return;

    try {
      await this.authService.updateOfficerByAdmin(registered.id, {
        departmentId: this.selectedDeptForAddOfficer.id,
        departmentName: this.selectedDeptForAddOfficer.name
      });
      await this.departmentService.loadDepartmentsFromBackend();

      this.toastMessage.set(`Assigned officer "${registered.name}" to ${this.selectedDeptForAddOfficer.name}`);
    } catch (err: any) {
      this.toastMessage.set(err.message || 'Failed to assign officer.');
    }

    this.isQuickAddOfficerModalOpen.set(false);
    this.quickSelectedOfficerId = '';
  }

  async removeOfficerFromDept(deptId: string, officerId: string) {
    try {
      const dept = this.departmentService.departments().find(d => d.id === deptId);
      const targetOfficer = dept?.assignedOfficers?.find(o => o.id === officerId);

      await this.authService.updateOfficerByAdmin(officerId, {
        departmentId: '',
        departmentName: 'Unassigned'
      });
      await this.departmentService.loadDepartmentsFromBackend();

      this.toastMessage.set(`Officer "${targetOfficer?.name || officerId}" unassigned from department.`);
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

  confirmationModal = signal<{
    title: string;
    message: string;
    confirmBtnText: string;
    isDestructive?: boolean;
    action: () => Promise<void>;
  } | null>(null);

  confirmRemoveOfficer(deptId: string, officerId: string, officerName: string) {
    this.confirmationModal.set({
      title: 'Remove Officer from Department',
      message: `Are you sure you want to remove "${officerName}" from this department? The officer will become Unassigned.`,
      confirmBtnText: 'Yes, Remove',
      isDestructive: true,
      action: async () => {
        await this.removeOfficerFromDept(deptId, officerId);
      }
    });
  }

  confirmDeleteDepartment(id: string, name: string) {
    this.confirmationModal.set({
      title: 'Delete Department',
      message: `Are you sure you want to delete department "${name}"? Solved grievances will be preserved, and open cases will be moved to unassigned tickets.`,
      confirmBtnText: 'Yes, Delete',
      isDestructive: true,
      action: async () => {
        await this.deleteDepartment(id, name);
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
    this.confirmationModal.set(null);
    if (modal && modal.action) {
      await modal.action();
    }
  }

  async executeSaveDepartment() {
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
    }
  }

  async toggleStatus(id: string) {
    try {
      await this.departmentService.toggleDepartmentStatus(id);
      this.toastMessage.set(`Department status updated.`);
    } catch (err: any) {
      this.toastMessage.set(err.message);
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
