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
  // Declaración de variables
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
    // Inicialización del formulario con validaciones mejoradas
    this.adminForm = this.fb.group({
      nombre: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50),
        Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
      ]],
      apellido: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50),
        Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
      ]],
      rut: ['', [
        Validators.required,
        rutValidator()
      ]],
      Email: ['', [
        Validators.required,
        Validators.email,
        Validators.maxLength(100),
        Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/)
      ]],
      currentPassword: [''],
      newPassword: ['', [
        Validators.minLength(6),
        Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/)
      ]],
      telefono: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(15),
        Validators.pattern(/^\+?[0-9]{8,15}$/)
      ]],
      fk_adcolegio: ['', Validators.required],
      Rol: ['Admin', Validators.required],
      isSuperAdmin: [false]
    });

    // Observación para verificar si el usuario actual es superadmin
    this.isSuperAdmin$ = this.firebaseService.getCurrentUser().pipe(
      switchMap(user => user ? from(this.firebaseService.getAdminData(user)) : of(null)),
      map(adminData => adminData?.isSuperAdmin || false),
      catchError(error => {
        return of(false);
      })
    );
  }

  // Inicialización del componente y carga de datos
  ngOnInit() {
    this.loadAdmins();
    this.loadColleges();
  }

  // Método para cargar la lista de administradores según permisos
  async loadAdmins() {
    if (this.showInactiveAdmins) {
      this.admins = await this.firebaseService.getAdmins();
    } else {
      this.admins = await this.firebaseService.getActiveAdmins();
    }
  }

  // Método para alternar la visualización de administradores inactivos
  toggleInactiveAdmins() {
    this.showInactiveAdmins = !this.showInactiveAdmins;
    this.loadAdmins();
  }

  // Método para cargar administradores activos
  async loadActiveAdmins() {
    this.admins = await this.firebaseService.getActiveAdmins();
  }

  // Método para cargar la lista de colegios
  async loadColleges() {
    this.colleges = await this.firebaseService.getColleges();
  }

  // Método para editar un administrador existente
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

  // Método para cancelar la edición
  cancelEdit() {
    this.isEditing = false;
    this.editingAdminId = null;
    this.adminForm.reset();
    this.adminForm.get('rut')?.enable();
  }

  // Método para enviar el formulario
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

  // Método para obtener el nombre del colegio
  getCollegeName(collegeId: string): string {
    const college = this.colleges.find(c => c.id === collegeId);
    return college ? college.Nombre : 'N/A';
  }

  // Método para actualizar la asignación de colegio del administrador actual
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

  // Método para desactivar un administrador
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

  // Método para activar un administrador
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
