import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FirebaseService, AdminData, College } from '../../../services/firebase.service';
import { CommonModule } from '@angular/common';
import { NumbersOnlyDirective } from '../../../validators/numbers-only.validator';
import { FirebaseError } from '@angular/fire/app';
import { Observable, from, of } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NumbersOnlyDirective],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {
  adminForm: FormGroup;
  admins: AdminData[] = [];
  colleges: College[] = [];
  isSuperAdmin$: Observable<boolean>;

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService
  ) {
    this.adminForm = this.fb.group({
      rut: ['', [Validators.required, Validators.maxLength(20)]],
      nombre: ['', [Validators.required, Validators.maxLength(20)]],
      apellido: ['', [Validators.required, Validators.maxLength(20)]],
      Email: ['', [Validators.required, Validators.email, Validators.maxLength(50)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      telefono: ['', [Validators.required, Validators.maxLength(20)]],
      fk_adcolegio: ['', Validators.required],
      Rol: ['Admin', Validators.required],
      isSuperAdmin: [false]
    });

    // Initialize isSuperAdmin$ observable
    this.isSuperAdmin$ = this.firebaseService.getCurrentUser().pipe(
      switchMap(user => user ? from(this.firebaseService.getAdminData(user)) : of(null)),
      map(adminData => adminData?.isSuperAdmin || false),
      catchError(error => {
        console.error('Error fetching admin data:', error);
        return of(false);
      })
    );
  }

  ngOnInit() {
    this.loadAdmins();
    this.loadColleges();
  }

  async loadAdmins() {
    this.admins = await this.firebaseService.getAdmins();
    console.log('Loaded admins:', this.admins);
  }

  async loadColleges() {
    this.colleges = await this.firebaseService.getColleges();
    console.log('Loaded colleges:', this.colleges);
  }

  async onSubmit() {
    if (this.adminForm.valid) {
      try {
        await this.firebaseService.addOrUpdateAdmin(this.adminForm.value);
        alert('Admin saved successfully');
        this.adminForm.reset();
      } catch (error) {
        console.error('Error saving admin:', error);
        alert('Error saving admin');
      }
    }
  }

  editAdmin(admin: AdminData) {
    this.adminForm.patchValue({
      rut: admin.rut,
      nombre: admin.nombre,
      apellido: admin.apellido,
      Email: admin.Email,
      telefono: admin.telefono,
      fk_adcolegio: admin.fk_adcolegio,
      Rol: admin.Rol
    });
    // Clear the password field when editing
    this.adminForm.get('password')?.setValue('');
  }

  getCollegeName(collegeId: string): string {
    const college = this.colleges.find(c => c.id === collegeId);
    return college ? college.Nombre : 'N/A';
  }

  updateOwnCollege(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const collegeId = selectElement.value;
    if (collegeId) {
      this.updateAdminCollege(collegeId);
    }
  }

  async updateAdminCollege(collegeId: string) {
    const currentUser = await firstValueFrom(this.firebaseService.getCurrentUser());
    if (currentUser) {
      const adminData = await this.firebaseService.getAdminData(currentUser);
      if (adminData) {
        adminData.fk_adcolegio = collegeId;
        await this.firebaseService.addOrUpdateAdmin(adminData);
        alert('Your college assignment has been updated.');
      }
    }
  }
}
