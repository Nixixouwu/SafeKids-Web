import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BusComponent } from './bus.component';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

describe('BusComponent', () => {
  let component: BusComponent;
  let fixture: ComponentFixture<BusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BusComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});