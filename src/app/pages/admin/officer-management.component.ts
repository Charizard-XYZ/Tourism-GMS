import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DepartmentService } from '../../core/services/department.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastComponent } from '../../common/components/toast.component';
import { RegisteredOfficer, formatPhoneNumber } from '../../core/models/user.model';

@Component({
  selector: 'app-officer-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <div class="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div class="inline-flex items-center space-x-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold uppercase mb-1">
            <span>Directorate Admin Portal</span>
          </div>
          <h1 class="text-2xl font-extrabold text-slate-900"> Officer Account Management</h1>
          <p class="text-xs text-slate-500">Register and edit Officers with secure credentials. Only registered officers can log in under Officer Login.</p>
        </div>

        <div class="flex items-center space-x-3">
          <button (click)="isRevokedModalOpen.set(true)" class="px-4 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-extrabold hover:bg-rose-700 shadow-md flex items-center space-x-2 transition">
            <span>Revoked Officers</span>
            <span class="px-2 py-0.5 bg-white/20 text-white text-[11px] font-bold rounded-full">{{ getRevokedOfficersCount() }}</span>
          </button>

          <button (click)="openRegisterModal()" class="px-5 py-2.5 bg-[#0F172A] text-white rounded-xl text-xs font-extrabold hover:bg-slate-800 shadow-md flex items-center space-x-2 transition">
            <span>Register New Officer</span>
          </button>
        </div>
      </div>

      <!-- Search & Department Filter Bar -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid sm:grid-cols-2 gap-4">
        <input 
          type="text" 
          [(ngModel)]="searchKeyword" 
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          data-lpignore="true"
          placeholder="Search by Officer ID (e.g. OFF-...), Name, or Email..." 
          class="px-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#A0C8C3]"
        />

        <select [(ngModel)]="departmentFilter" class="px-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#A0C8C3]">
          <option value="ALL">All Departments</option>
          <option *ngFor="let d of departmentService.departments()" [value]="d.id">
            {{ d.name }} ({{ d.code }})
          </option>
        </select>
      </div>

      <!-- Officer list Table -->
      <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-900 text-white uppercase text-[10px] font-bold">
            <tr>
              <th class="p-4">Officer ID</th>
              <th class="p-4">Officer Name</th>
              <th class="p-4">Assigned Department</th>
              <th class="p-4">Official Email (Login)</th>
              <th class="p-4">Assigned Password</th>
              <th class="p-4">Contact Phone</th>
              <th class="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <tr *ngFor="let off of filteredOfficers()" class="hover:bg-slate-50">
              <td class="p-4 font-bold text-amber-700">{{ off.id }}</td>
              <td class="p-4 font-bold text-slate-900">{{ off.name }}</td>
              <td class="p-4 font-bold">
                <span *ngIf="getOfficerDepartmentName(off) !== 'Unassigned'" class="text-teal-800">{{ getOfficerDepartmentName(off) }}</span>
                <span *ngIf="getOfficerDepartmentName(off) === 'Unassigned'" class="text-rose-600 italic">Unassigned</span>
              </td>
              <td class="p-4 text-slate-600 font-mono">{{ off.email }}</td>
              <td class="p-4 text-slate-500 font-mono bg-slate-50 rounded-lg px-2 text-[11px] max-w-[120px] truncate">
                {{ off.password || '••••••••' }}
              </td>
              <td class="p-4 text-slate-500">{{ off.phone || '—' }}</td>
              <td class="p-4 text-right space-x-2">
                <button (click)="openEditModal(off)" class="px-3 py-1.5 bg-slate-100 text-slate-800 hover:bg-slate-200 rounded-lg text-xs font-bold transition">
                  Edit
                </button>
                <button (click)="revokeOfficer(off.id, off.name)" class="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold transition">
                  Revoke Access
                </button>
              </td>
            </tr>

            <tr *ngIf="filteredOfficers().length === 0">
              <td colspan="7" class="p-8 text-center text-slate-400 italic">
                No active Officers found matching the search criteria.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Register / Edit Officer Modal -->
      <div *ngIf="isModalOpen()" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div class="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
          <div class="flex justify-between items-center border-b pb-3">
            <h3 class="font-bold text-lg text-slate-900">{{ editingOfficerId() ? 'Edit Officer' : 'Register Officer' }}</h3>
            <button (click)="isModalOpen.set(false)" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
          </div>

          <p class="text-xs text-slate-500">Configure login credentials and department assignment for this officer.</p>

          <form (submit)="saveOfficer()" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name *</label>
              <input type="text" [(ngModel)]="newOfficer.name" name="sec_off_full_title" required autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" placeholder="Enter officer name" class="w-full px-3 py-2 border rounded-xl text-xs" />
              <p *ngIf="hasSubmitted() && !newOfficer.name.trim()" class="text-[11px] text-rose-600 font-bold mt-1">Please fill out all required fields.</p>
              <p *ngIf="hasSubmitted() && newOfficer.name.trim() && isNameNumericInvalid(newOfficer.name)" class="text-[11px] text-rose-600 font-bold mt-1">Names can not be in number</p>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Official Email (Login ID) *</label>
              <input type="text" [(ngModel)]="newOfficer.email" name="sec_off_reg_addr" required autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" placeholder="example@gmail.com" class="w-full px-3 py-2 border rounded-xl text-xs" />
              <p *ngIf="hasSubmitted() && !newOfficer.email.trim()" class="text-[11px] text-rose-600 font-bold mt-1">Please fill out all required fields.</p>
              <p *ngIf="hasSubmitted() && newOfficer.email.trim() && !isEmailValid(newOfficer.email)" class="text-[11px] text-rose-600 font-bold mt-1">Invalid email format. Must be in format: username@gmail.com</p>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">{{ editingOfficerId() ? 'Update Password *' : 'Create Password *' }}</label>
              <div class="relative">
                <input 
                  type="text" 
                  [style.-webkit-text-security]="showPassword() ? 'none' : 'disc'" 
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
                  (click)="showPassword.set(!showPassword())" 
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1 focus:outline-none"
                >
                  {{ showPassword() ? 'Hide' : 'Show' }}
                </button>
              </div>
              <p *ngIf="hasSubmitted() && !newOfficer.password.trim()" class="text-[11px] text-rose-600 font-bold mt-1">Please fill out all required fields.</p>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Confirm Password *</label>
              <div class="relative">
                <input 
                  type="text" 
                  [style.-webkit-text-security]="showConfirmPassword() ? 'none' : 'disc'" 
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
                  (click)="showConfirmPassword.set(!showConfirmPassword())" 
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1 focus:outline-none"
                >
                  {{ showConfirmPassword() ? 'Hide' : 'Show' }}
                </button>
              </div>
              <p *ngIf="hasSubmitted() && !newOfficer.confirmPassword.trim()" class="text-[11px] text-rose-600 font-bold mt-1">Please fill out all required fields.</p>
              <p *ngIf="hasSubmitted() && newOfficer.password.trim() && newOfficer.confirmPassword.trim() && newOfficer.password !== newOfficer.confirmPassword" class="text-[11px] text-rose-600 font-bold mt-1">Passwords do not match.</p>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Designation / Role Title</label>
              <input type="text" [(ngModel)]="newOfficer.designation" name="sec_off_desig_title" autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" placeholder="e.g. Senior Nodal Officer" class="w-full px-3 py-2 border rounded-xl text-xs" />
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
              <input type="text" [ngModel]="newOfficer.phone" (ngModelChange)="onOfficerPhoneChange($event)" name="sec_off_ph_val" autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" placeholder="e.g. +91 9816012345 or 9816012345" class="w-full px-3 py-2 border rounded-xl text-xs" />
              <p *ngIf="hasSubmitted() && newOfficer.phone.trim() && isPhoneTextInvalid(newOfficer.phone)" class="text-[11px] text-rose-600 font-bold mt-1">Enter phone number</p>
            </div>

            <div class="flex space-x-3 pt-4 border-t">
              <button type="button" (click)="isModalOpen.set(false)" class="flex-1 bg-slate-100 py-3 rounded-xl text-xs font-bold text-slate-600">Cancel</button>
              <button type="submit" class="flex-1 bg-[#0F172A] text-white py-3 rounded-xl text-xs font-extrabold hover:bg-slate-800">
                {{ editingOfficerId() ? 'Update Credentials' : 'Register Officer' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Revoked Officers Roster Modal -->
      <div *ngIf="isRevokedModalOpen()" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div class="bg-white rounded-3xl max-w-3xl w-full p-6 space-y-4 shadow-2xl animate-fade-in relative max-h-[85vh] overflow-y-auto">
          <div class="flex justify-between items-center border-b pb-3">
            <div>
              <span class="px-2.5 py-0.5 bg-rose-100 text-rose-800 font-extrabold uppercase text-[10px] rounded-full">Access Revoked Roster</span>
              <h3 class="font-extrabold text-lg text-slate-900 mt-1">Revoked Officers Roster</h3>
            </div>
            <button (click)="isRevokedModalOpen.set(false)" class="text-slate-400 hover:text-slate-600 font-bold text-xl">✕</button>
          </div>

          <p class="text-xs text-slate-500">List of officers whose credentials have been revoked by Admin. Revoked officers cannot log in. You can restore access or permanently remove officer records.</p>

          <div class="overflow-x-auto border border-slate-200 rounded-2xl">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-900 text-white uppercase text-[10px] font-bold">
                <tr>
                  <th class="p-3">Officer ID</th>
                  <th class="p-3">Name</th>
                  <th class="p-3">Email</th>
                  <th class="p-3">Phone</th>
                  <th class="p-3">Status</th>
                  <th class="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-medium">
                <tr *ngFor="let off of getRevokedOfficers()" class="hover:bg-slate-50">
                  <td class="p-3 font-bold text-rose-700 font-mono">{{ off.id }}</td>
                  <td class="p-3 font-bold text-slate-900">{{ off.name }}</td>
                  <td class="p-3 text-slate-600 font-mono">{{ off.email }}</td>
                  <td class="p-3 text-slate-500">{{ off.phone || '—' }}</td>
                  <td class="p-3">
                    <span class="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-extrabold uppercase rounded-md">Access Revoked</span>
                  </td>
                  <td class="p-3 text-right space-x-2">
                    <button (click)="unrevokeOfficer(off.id, off.name)" class="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-bold transition">
                      Unrevoke Officer
                    </button>
                    <button (click)="deleteOfficerPermanently(off.id, off.name)" class="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-bold transition">
                      Delete
                    </button>
                  </td>
                </tr>

                <tr *ngIf="getRevokedOfficers().length === 0">
                  <td colspan="6" class="p-8 text-center text-slate-400 italic text-xs">
                    No revoked officers found in system roster.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="pt-2 text-right">
            <button (click)="isRevokedModalOpen.set(false)" class="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800">Close</button>
          </div>
        </div>
      </div>

      <app-toast [message]="toastMessage()" (dismiss)="toastMessage.set(null)"></app-toast>

    </div>
  `
})
export class OfficerManagementComponent {
  departmentService = inject(DepartmentService);
  authService = inject(AuthService);

  isModalOpen = signal<boolean>(false);
  isRevokedModalOpen = signal<boolean>(false);
  editingOfficerId = signal<string | null>(null);
  showPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);
  hasSubmitted = signal<boolean>(false);
  toastMessage = signal<string | null>(null);

  searchKeyword = '';
  departmentFilter = 'ALL';

  filteredOfficers(): RegisteredOfficer[] {
    return this.authService.registeredOfficers().filter(off => {
      if (off.isRevoked) return false;
      const keyword = this.searchKeyword.toLowerCase().trim();
      const matchesSearch = !keyword ||
        off.id.toLowerCase().includes(keyword) ||
        off.name.toLowerCase().includes(keyword) ||
        off.email.toLowerCase().includes(keyword);

      const matchesDept = this.departmentFilter === 'ALL' || off.departmentId === this.departmentFilter || off.departmentName === this.departmentFilter;

      return matchesSearch && matchesDept;
    });
  }

  getRevokedOfficers(): RegisteredOfficer[] {
    return this.authService.registeredOfficers().filter(off => off.isRevoked === true);
  }

  getRevokedOfficersCount(): number {
    return this.getRevokedOfficers().length;
  }

  getOfficerDepartmentName(off: RegisteredOfficer): string {
    if (!off.departmentId || off.departmentName === 'Unassigned') return 'Unassigned';
    const dept = this.departmentService.departments().find(d => d.id === off.departmentId || d.name === off.departmentName);
    if (!dept) return 'Unassigned';

    if (dept.assignedOfficers && dept.assignedOfficers.length > 0) {
      const isAssigned = dept.assignedOfficers.some(o => o.id === off.id || o.email.toLowerCase() === off.email.toLowerCase());
      if (!isAssigned) {
        return 'Unassigned';
      }
    }

    return dept.name;
  }

  newOfficer = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    departmentId: '',
    phone: '',
    designation: ''
  };

  openRegisterModal() {
    this.editingOfficerId.set(null);
    this.hasSubmitted.set(false);
    const defaultDept = this.departmentService.departments()[0]?.id || '';
    this.newOfficer = { name: '', email: '', password: '', confirmPassword: '', departmentId: defaultDept, phone: '', designation: '' };
    this.isModalOpen.set(true);
  }

  openEditModal(off: RegisteredOfficer) {
    this.editingOfficerId.set(off.id);
    this.hasSubmitted.set(false);
    const defaultDept = this.departmentService.departments()[0]?.id || '';
    this.newOfficer = {
      name: off.name,
      email: off.email,
      password: off.password || '',
      confirmPassword: off.password || '',
      departmentId: off.departmentId || defaultDept,
      phone: off.phone || '',
      designation: off.designation || ''
    };
    this.isModalOpen.set(true);
  }

  onOfficerPhoneChange(val: string) {
    this.newOfficer.phone = val;
  }

  isNameNumericInvalid(val: string): boolean {
    if (!val.trim()) return false;
    return /\d/.test(val);
  }

  isEmailValid(val: string): boolean {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val.trim());
  }

  isPhoneTextInvalid(val: string): boolean {
    if (!val.trim()) return false;
    const clean = val.replace(/[\s+-]/g, '');
    return !/^\d+$/.test(clean) || clean.length !== 10;
  }

  saveOfficer() {
    this.hasSubmitted.set(true);
    if (!this.newOfficer.name.trim() || !this.newOfficer.email.trim() || !this.newOfficer.password.trim() || !this.newOfficer.confirmPassword.trim()) {
      this.toastMessage.set('Please fill out all required fields.');
      return;
    }

    if (this.isNameNumericInvalid(this.newOfficer.name)) {
      this.toastMessage.set('Names can not be in number');
      return;
    }

    if (!this.isEmailValid(this.newOfficer.email)) {
      this.toastMessage.set('Invalid email format. Please enter a valid officer email address (e.g. officer@hp.gov.in).');
      return;
    }

    if (this.newOfficer.phone.trim() && this.isPhoneTextInvalid(this.newOfficer.phone)) {
      this.toastMessage.set('Enter phone number');
      return;
    }

    if (this.newOfficer.password !== this.newOfficer.confirmPassword) {
      this.toastMessage.set('Passwords do not match. Please verify.');
      return;
    }

    const dept = this.departmentService.departments().find(d => d.id === this.newOfficer.departmentId) || this.departmentService.departments()[0];
    const deptName = dept ? dept.name : 'Unassigned Department';
    const formattedPhone = formatPhoneNumber(this.newOfficer.phone);

    try {
      if (this.editingOfficerId()) {
        // Edit mode
        this.authService.updateOfficerByAdmin(this.editingOfficerId()!, {
          name: this.newOfficer.name.trim(),
          email: this.newOfficer.email.trim(),
          password: this.newOfficer.password.trim(),
          departmentId: dept ? dept.id : '',
          departmentName: deptName,
          phone: formattedPhone
        });

        if (dept) {
          this.departmentService.addOfficerToDepartment(dept.id, {
            name: this.newOfficer.name.trim(),
            email: this.newOfficer.email.trim(),
            designation: 'Nodal Officer',
            phone: formattedPhone
          });
        }

        this.toastMessage.set(`Officer details updated successfully for "${this.newOfficer.name}".`);
      } else {
        // Create mode
        this.authService.registerOfficerByAdmin({
          name: this.newOfficer.name.trim(),
          email: this.newOfficer.email.trim(),
          password: this.newOfficer.password.trim(),
          designation: 'Nodal Officer',
          departmentId: dept ? dept.id : '',
          departmentName: deptName,
          phone: formattedPhone
        });

        if (dept) {
          this.departmentService.addOfficerToDepartment(dept.id, {
            name: this.newOfficer.name.trim(),
            email: this.newOfficer.email.trim(),
            designation: 'Nodal Officer',
            phone: formattedPhone
          });
        }

        this.toastMessage.set(`Officer "${this.newOfficer.name}" registered successfully! Access granted.`);
      }

      this.isModalOpen.set(false);
      this.editingOfficerId.set(null);
      const defaultDept = this.departmentService.departments()[0]?.id || '';
      this.newOfficer = { name: '', email: '', password: '', confirmPassword: '', departmentId: defaultDept, phone: '', designation: '' };
    } catch (err: any) {
      this.toastMessage.set(err.message || 'Action failed.');
    }
  }

  revokeOfficer(id: string, name: string) {
    const registered = this.authService.registeredOfficers().find(o => o.id === id);
    this.authService.revokeOfficerAccess(id);
    this.departmentService.removeOfficerFromAllDepartments(id);
    if (registered?.email) {
      this.departmentService.removeOfficerFromAllDepartments(registered.email);
    }
    this.toastMessage.set(`Officer access revoked for "${name}". Removed from department and credentials disabled.`);
  }

  unrevokeOfficer(id: string, name: string) {
    this.authService.restoreOfficerAccess(id);
    this.toastMessage.set(`Officer "${name}" unrevoked successfully! Credentials re-enabled.`);
  }

  deleteOfficerPermanently(id: string, name: string) {
    this.authService.removeOfficerByAdmin(id);
    this.toastMessage.set(`Officer account permanently deleted for "${name}".`);
  }
}
