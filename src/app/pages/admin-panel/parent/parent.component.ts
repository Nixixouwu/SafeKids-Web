import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FirebaseService, Apoderado, College, AdminData } from '../../../services/firebase.service';
import { CommonModule } from '@angular/common';
import { NumbersOnlyDirective } from '../../../validators/numbers-only.validator';
import { firstValueFrom, combineLatest, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AdminPanelComponent } from '../admin-panel.component';

@Component({
  selector: 'app-parent',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NumbersOnlyDirective],
  templateUrl: './parent.component.html',
  styleUrls: ['./parent.component.scss']
})
export class ParentComponent implements OnInit {
  apoderadoForm: FormGroup;
  apoderados: Apoderado[] = [];
  colleges: College[] = [];
  collegeMap: Map<string, string> = new Map();
  currentAdminCollege: string | null = null;

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService,
    private adminPanelComponent: AdminPanelComponent
  ) {
    this.apoderadoForm = this.fb.group({
      RUT: ['', [Validators.required, Validators.maxLength(20)]],
      Nombre: ['', [Validators.required, Validators.maxLength(20)]],
      Apellido: ['', [Validators.required, Validators.maxLength(20)]],
      Email: ['', [Validators.required, Validators.email, Validators.maxLength(50)]],
      Telefono: ['', [Validators.required, Validators.maxLength(20)]],
      FK_APColegio: ['', Validators.required],
      Imagen: ['', Validators.maxLength(20)]
    });
  }

  ngOnInit() {
    this.loadApoderados();
    this.loadColleges();
  }

  async loadCurrentAdminData() {
    try {
      const currentUser = await firstValueFrom(this.firebaseService.getCurrentUser());
      if (currentUser) {
        const adminData = await this.firebaseService.getAdminData(currentUser);
        if (adminData) {
          this.currentAdminCollege = adminData.fk_adcolegio;
          console.log('Current admin college:', this.currentAdminCollege);
        }
      }
    } catch (error) {
      console.error('Error loading current admin data:', error);
    }
  }

  async loadApoderados() {
    combineLatest([
      this.adminPanelComponent.isSuperAdmin$,
      this.adminPanelComponent.currentAdminCollege$
    ]).pipe(
      switchMap(([isSuperAdmin, collegeId]) => {
        console.log('Is Super Admin:', isSuperAdmin, 'College ID:', collegeId);
        if (isSuperAdmin) {
          return this.firebaseService.getApoderados();
        } else {
          return collegeId ? this.firebaseService.getApoderadosByCollege(collegeId) : of([]);
        }
      })
    ).subscribe(
      apoderados => {
        this.apoderados = apoderados;
        console.log('Loaded apoderados:', this.apoderados);
      },
      error => {
        console.error('Error loading apoderados:', error);
        this.apoderados = [];
      }
    );
  }

  async loadColleges() {
    combineLatest([
      this.adminPanelComponent.isSuperAdmin$,
      this.adminPanelComponent.currentAdminCollege$
    ]).pipe(
      switchMap(([isSuperAdmin, collegeId]) => {
        console.log('Is Super Admin:', isSuperAdmin, 'College ID:', collegeId);
        if (isSuperAdmin) {
          return this.firebaseService.getColleges();
        } else {
          return collegeId ? this.firebaseService.getCollege(collegeId).then(college => college ? [college] : []) : of([]);
        }
      })
    ).subscribe(
      colleges => {
        this.colleges = colleges;
        this.collegeMap = new Map(this.colleges.map(college => [college.id, college.Nombre]));
        console.log('Loaded colleges:', this.colleges);
      },
      error => {
        console.error('Error loading colleges:', error);
        this.colleges = [];
      }
    );
  }

  getCollegeName(id: string): string {
    return this.collegeMap.get(id) || 'Unknown College';
  }

  async onSubmit() {
    if (this.apoderadoForm.valid) {
      const apoderadoData = this.apoderadoForm.value;
      if (this.currentAdminCollege) {
        apoderadoData.FK_APColegio = this.currentAdminCollege;
      }
      try {
        await this.firebaseService.addOrUpdateApoderado(apoderadoData);
        console.log('Apoderado saved successfully');
        this.apoderadoForm.reset();
        this.loadApoderados();
      } catch (error) {
        console.error('Error submitting apoderado:', error);
      }
    } else {
      console.log('Form is invalid', this.apoderadoForm.errors);
    }
  }

  editApoderado(apoderado: Apoderado) {
    this.apoderadoForm.patchValue(apoderado);
  }

  async deleteApoderado(rut: string) {
    if (confirm('¿Estás seguro de que quieres eliminar este apoderado?')) {
      await this.firebaseService.deleteApoderado(rut);
      this.loadApoderados();
    }
  }
}
