import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FirebaseService, AdminData, College } from '../../../services/firebase.service';
import { CommonModule } from '@angular/common';
import { NumbersOnlyDirective } from '../../../validators/numbers-only.validator';
import { Observable, catchError, firstValueFrom, from, map, of, switchMap } from 'rxjs';
import { rutValidator } from '../../../validators/rut.validator';
import { RutFormatterDirective } from '../../../validators/rut-formatter.validator';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NumbersOnlyDirective, RutFormatterDirective],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {
  adminForm: FormGroup;
  admins: AdminData[] = [];
  colleges: College[] = [];
  isSuperAdmin$: Observable<boolean>;
  showInactiveAdmins: boolean = false;
  isEditing: boolean = false;
  editingAdminId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService
  ) {
    this.adminForm = this.fb.group({
      rut: ['', [Validators.required, rutValidator()]],
      nombre: ['', [Validators.required, Validators.maxLength(20)]],
      apellido: ['', [Validators.required, Validators.maxLength(20)]],
      Email: ['', [Validators.required, Validators.email, Validators.maxLength(50)]],
      password: [''],
      currentPassword: [''],
      newPassword: [''],
      telefono: ['', [Validators.required, Validators.maxLength(20)]],
      fk_adcolegio: ['', Validators.required],
      Rol: ['Admin', Validators.required],
      isSuperAdmin: [false]
    });

    this.isSuperAdmin$ = this.firebaseService.getCurrentUser().pipe(
      switchMap(user => user ? from(this.firebaseService.getAdminData(user)) : of(null)),
      map(adminData => adminData?.isSuperAdmin || false),
      catchError(error => {
        return of(false);
      })
    );
  }

  ngOnInit() {
    this.loadAdmins();
    this.loadColleges();
  }

  async loadAdmins() {
    if (this.showInactiveAdmins) {
      this.admins = await this.firebaseService.getAdmins();
    } else {
      this.admins = await this.firebaseService.getActiveAdmins();
    }
  }

  toggleInactiveAdmins() {
    this.showInactiveAdmins = !this.showInactiveAdmins;
    this.loadAdmins();
  }

  async loadActiveAdmins() {
    this.admins = await this.firebaseService.getActiveAdmins();
  }

  async loadColleges() {
    this.colleges = await this.firebaseService.getColleges();
  }

  editAdmin(admin: AdminData) {
    this.isEditing = true;
    this.editingAdminId = admin.rut;
    this.adminForm.patchValue({
      rut: admin.rut,
      nombre: admin.nombre,
      apellido: admin.apellido,
      Email: admin.Email,
      telefono: admin.telefono,
      fk_adcolegio: admin.fk_adcolegio,
      Rol: admin.Rol,
      isSuperAdmin: admin.isSuperAdmin
    });
    this.adminForm.get('password')?.setValue('');
    this.adminForm.get('currentPassword')?.setValue('');
    this.adminForm.get('newPassword')?.setValue('');
    this.adminForm.get('rut')?.disable();
    this.adminForm.get('Email')?.disable();
  }

  cancelEdit() {
    this.isEditing = false;
    this.editingAdminId = null;
    this.adminForm.reset();
    this.adminForm.get('rut')?.enable();
  }

  async onSubmit() {
    if (this.adminForm.valid) {
      try {
        const formData = this.adminForm.getRawValue();
        
        if (!this.isEditing) {
          await this.firebaseService.addAdmin(formData);
          this.adminForm.reset();
          this.loadAdmins();
        } else {
          if (formData.currentPassword && formData.newPassword) {
            await this.firebaseService.updatePassword(formData.Email, formData.currentPassword, formData.newPassword);
          }
          delete formData.currentPassword;
          delete formData.newPassword;
          delete formData.password;
          await this.firebaseService.updateAdmin(formData);
        }
        
        this.adminForm.reset();
        this.isEditing = false;
        this.editingAdminId = null;
        this.adminForm.get('rut')?.enable();
        this.loadAdmins();
        alert('Admin guardado exitosamente');
      } catch (error) {
        if (error instanceof Error) {
          alert(`Error al guardar admin: ${error.message}`);
        } else {
          alert('Ocurrió un error inesperado al guardar el admin.');
        }
      }
    }
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
        alert('Su asignación de colegio ha sido actualizada.');
      }
    }
  }

  async deactivateAdmin(admin: AdminData) {
    if (confirm(`¿Está seguro de que desea desactivar a ${admin.nombre} ${admin.apellido}?`)) {
      try {
        await this.firebaseService.deactivateAdmin(admin.rut);
        alert('Administrador desactivado exitosamente');
        this.loadAdmins();
      } catch (error) {
        alert('Error al desactivar el administrador');
      }
    }
  }

  async activateAdmin(admin: AdminData) {
    if (confirm(`¿Está seguro de que desea activar a ${admin.nombre} ${admin.apellido}?`)) {
      try {
        await this.firebaseService.activateAdmin(admin.rut);
        alert('Administrador activado exitosamente');
        this.loadAdmins();
      } catch (error) {
        alert('Error al activar el administrador');
      }
    }
  }
}
