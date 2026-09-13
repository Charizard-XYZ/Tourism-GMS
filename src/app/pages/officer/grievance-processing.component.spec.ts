import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';
import { GrievanceProcessingComponent } from './grievance-processing.component';
import { GrievanceService } from '../../core/services/grievance.service';
import { AuthService } from '../../core/services/auth.service';
import { DepartmentService } from '../../core/services/department.service';
import { FirebaseService } from '../../core/services/firebase.service';
import { Grievance } from '../../core/models/complaint.model';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as storageModule from 'firebase/storage';

vi.mock('firebase/storage', () => {
  return {
    ref: vi.fn().mockReturnValue({}),
    uploadBytesResumable: vi.fn().mockReturnValue({
      on: vi.fn((_event: string, onProgress: any, _onError: any, onComplete: any) => {
        if (onProgress) onProgress({ bytesTransferred: 100, totalBytes: 100 });
        if (onComplete) onComplete();
      }),
      snapshot: { ref: {} }
    }),
    getDownloadURL: vi.fn().mockResolvedValue('https://firebasestorage.googleapis.com/v0/b/proofs/test-proof.pdf')
  };
});

describe('GrievanceProcessingComponent - Proof Auto-Upload Workflow', () => {
  let component: GrievanceProcessingComponent;
  let fixture: ComponentFixture<GrievanceProcessingComponent>;

  const mockGrievance: Grievance = {
    id: 'grv-123',
    trackingCode: 'TRK-987654',
    grievanceCode: 'TRK-987654',
    touristId: 'tourist-1',
    touristName: 'Jane Tourist',
    touristEmail: 'jane@example.com',
    title: 'Hotel Overcharging',
    description: 'Overcharged for rooms beyond regulated tariff.',
    category: 'Hotels',
    location: 'Shimla Mall Road',
    status: 'in_progress',
    isEscalated: false,
    assignedOfficerId: 'officer-uid-1',
    assignedOfficerName: 'Officer Bob',
    departmentId: 'dept-1',
    departmentName: 'Tourism Oversight',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attachments: [],
    resolutionAttachments: []
  };

  let mockGrievanceService: any;
  let mockAuthService: any;
  let mockDepartmentService: any;
  let mockFirebaseService: any;

  beforeEach(async () => {
    mockGrievanceService = {
      getGrievanceById: vi.fn().mockReturnValue({ ...mockGrievance }),
      fetchGrievanceById: vi.fn().mockResolvedValue({ ...mockGrievance }),
      updateStatus: vi.fn().mockResolvedValue(undefined),
      getCommentsForGrievance: vi.fn().mockReturnValue([]),
      addComment: vi.fn().mockResolvedValue(undefined)
    };

    mockAuthService = {
      currentUser: signal({
        uid: 'officer-uid-1',
        email: 'officer@example.com',
        displayName: 'Officer Bob',
        role: 'officer'
      })
    };

    mockDepartmentService = {
      departments: signal([
        { id: 'dept-1', name: 'Tourism Oversight', isActive: true }
      ])
    };

    mockFirebaseService = {
      storage: {},
      db: {}
    };

    await TestBed.configureTestingModule({
      imports: [GrievanceProcessingComponent],
      providers: [
        provideRouter([]),
        { provide: GrievanceService, useValue: mockGrievanceService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: DepartmentService, useValue: mockDepartmentService },
        { provide: FirebaseService, useValue: mockFirebaseService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? 'grv-123' : null)
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GrievanceProcessingComponent);
    component = fixture.componentInstance;
    await component.ngOnInit();
    fixture.detectChanges();
  });

  it('1. should create the component and initialize with assigned grievance', () => {
    expect(component).toBeTruthy();
    expect(component.grievance?.id).toBe('grv-123');
    expect(component.isAssignedToCurrentOfficer()).toBe(true);
  });

  it('2. confirms NO separate "Upload Proof File" button exists in the DOM', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(compiled.querySelectorAll('button'));
    const uploadProofButton = buttons.find(b => b.textContent?.includes('Upload Proof File'));
    expect(uploadProofButton).toBeUndefined();
  });

  it('3. confirms initial state clearly displays "No file selected"', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(component.selectedFile).toBeNull();
    expect(compiled.textContent).toContain('No file selected');
  });

  it('4. displays "Selected: filename.pdf" when a valid PDF is selected', () => {
    const file = new File(['%PDF-dummy-content'], 'inspection-report.pdf', { type: 'application/pdf' });
    const event = {
      target: {
        files: [file]
      }
    } as unknown as Event;

    component.onFileSelected(event);
    fixture.detectChanges();

    expect(component.selectedFile).toBe(file);
    expect(component.uploadState()).toBe('selected');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Selected: inspection-report.pdf');
  });

  it('5. rejects unsupported file formats with clear error message', () => {
    const file = new File(['dummy executable'], 'malicious.exe', { type: 'application/x-msdownload' });
    const event = {
      target: {
        files: [file],
        value: 'malicious.exe'
      }
    } as unknown as Event;

    component.onFileSelected(event);
    fixture.detectChanges();

    expect(component.selectedFile).toBeNull();
    expect(component.uploadState()).toBe('error');
    expect(component.uploadErrorMessage()).toContain('Unsupported file format');
  });

  it('6. rejects oversized files exceeding 10MB limit', () => {
    const largeFile = new File([''], 'huge-photo.jpg', { type: 'image/jpeg' });
    Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 });

    const event = {
      target: {
        files: [largeFile],
        value: 'huge-photo.jpg'
      }
    } as unknown as Event;

    component.onFileSelected(event);
    fixture.detectChanges();

    expect(component.selectedFile).toBeNull();
    expect(component.uploadState()).toBe('error');
    expect(component.uploadErrorMessage()).toContain('exceeds 10 MB limit');
  });

  it('7. prevents resolving without a required resolution report and proof file', async () => {
    component.selectedStatus = 'resolved';
    component.resolutionReport = '';
    component.selectedFile = null;
    component.resolutionFiles = [];

    await component.saveStatusUpdate();

    expect(mockGrievanceService.updateStatus).not.toHaveBeenCalled();
    expect(component.toastMessage()).toContain('Official resolution report is required');

    component.resolutionReport = 'Inspection conducted and hotel penalized.';
    await component.saveStatusUpdate();

    expect(mockGrievanceService.updateStatus).not.toHaveBeenCalled();
    expect(component.toastMessage()).toContain('A proof file is required');
  });

  it('8. confirms Officer cannot set status to "closed" or "assigned"', async () => {
    (component as any).selectedStatus = 'closed';
    await component.saveStatusUpdate();

    expect(mockGrievanceService.updateStatus).not.toHaveBeenCalled();
    expect(component.toastMessage()).toContain('Officers cannot set grievance status to closed or assigned');

    (component as any).selectedStatus = 'assigned';
    await component.saveStatusUpdate();

    expect(mockGrievanceService.updateStatus).not.toHaveBeenCalled();
    expect(component.toastMessage()).toContain('Officers cannot set grievance status to closed or assigned');
  });

  it('9. dynamically transitions main button text across workflow states', () => {
    // Idle state
    expect(component.mainButtonLabel()).toBe('Update Case Status & Notify Tourist');

    // Uploading state
    component.uploadState.set('uploading');
    expect(component.mainButtonLabel()).toBe('Uploading proof...');

    // Updating state
    component.uploadState.set('idle');
    component.isUpdatingStatus.set(true);
    expect(component.mainButtonLabel()).toBe('Updating Case...');

    // Success state
    component.isUpdatingStatus.set(false);
    component.isSuccess.set(true);
    expect(component.mainButtonLabel()).toBe('Case updated and tourist notified');
  });

  it('10. automatically uploads real selected proof file upon clicking update and saves reference', async () => {
    const file = new File(['%PDF-1.4 report'], 'inspection-proof.pdf', { type: 'application/pdf' });
    component.selectedFile = file;
    component.uploadState.set('selected');
    component.selectedStatus = 'resolved';
    component.resolutionReport = 'Inspection complete and penalty issued.';

    await component.saveStatusUpdate();

    expect(storageModule.uploadBytesResumable).toHaveBeenCalled();
    expect(storageModule.getDownloadURL).toHaveBeenCalled();
    expect(mockGrievanceService.updateStatus).toHaveBeenCalledWith(
      'grv-123',
      'resolved',
      'Inspection complete and penalty issued.',
      [
        expect.objectContaining({
          name: 'inspection-proof.pdf',
          url: 'https://firebasestorage.googleapis.com/v0/b/proofs/test-proof.pdf'
        })
      ]
    );
    expect(component.isSuccess()).toBe(true);
    expect(component.toastMessage()).toBe('Case updated and tourist notified');
    expect(component.mainButtonLabel()).toBe('Case updated and tourist notified');
  });

  it('11. handles upload failure safely: halts update, keeps selectedFile available for retry, does not notify', async () => {
    vi.mocked(storageModule.uploadBytesResumable).mockReturnValueOnce({
      on: vi.fn((_event: string, _progress: any, onError: any) => {
        if (onError) onError(new Error('Network error uploading proof'));
      }),
      snapshot: { ref: {} }
    } as any);

    const file = new File(['%PDF-content'], 'retry-doc.pdf', { type: 'application/pdf' });
    component.selectedFile = file;
    component.uploadState.set('selected');
    component.selectedStatus = 'resolved';
    component.resolutionReport = 'Inspection complete.';

    await component.saveStatusUpdate();

    expect(mockGrievanceService.updateStatus).not.toHaveBeenCalled();
    expect(component.selectedFile).toBe(file);
    expect(component.uploadState()).toBe('error');
    expect(component.uploadErrorMessage()).toContain('Network error uploading proof');
    expect(component.toastMessage()).toBe('Failed to upload proof file. Please retry.');
    expect(component.isSuccess()).toBe(false);
  });

  it('12. retains and displays existing attached resolution files', () => {
    component.resolutionFiles = [
      { name: 'prior-inspection.pdf', url: 'https://example.com/prior.pdf', size: '1.2 MB' }
    ];
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Attached Resolution Proof Files');
    expect(compiled.textContent).toContain('prior-inspection.pdf');
  });
});
