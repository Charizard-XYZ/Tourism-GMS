import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Complaint } from './complaint';

describe('Complaint', () => {
  let component: Complaint;
  let fixture: ComponentFixture<Complaint>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Complaint],
    }).compileComponents();

    fixture = TestBed.createComponent(Complaint);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
