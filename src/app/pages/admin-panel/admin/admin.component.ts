import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FirebaseService, AdminData, College } from '../../../services/firebase.service';
import { CommonModule } from '@angular/common';
import { NumbersOnlyDirective } from '../../../validators/numbers-only.validator';
import { Observable, catchError, firstValueFrom, from, map, of, switchMap } from 'rxjs';

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
  showInactiveAdmins: boolean = false;
  isEditing: boolean = false;
  editingAdminId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService
  ) {
    this.adminForm = this.fb.group({
      rut: ['', [Validators.required, Validators.maxLength(20)]],
      nombre: ['', [Validators.required, Validators.maxLength(20)]],
      apellido: ['', [Validators.required, Validators.maxLength(20)]],
      Email: ['', [Validators.required, Validators.email, Validators.maxLength(50)]],
      currentPassword: [''],
      newPassword: [''],
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
    if (this.showInactiveAdmins) {
      this.admins = await this.firebaseService.getAdmins();
    } else {
      this.admins = await this.firebaseService.getActiveAdmins();
    }
    console.log('Loaded admins:', this.admins);
  }

  toggleInactiveAdmins() {
    this.showInactiveAdmins = !this.showInactiveAdmins;
    this.loadAdmins();
  }

  async loadActiveAdmins() {
    this.admins = await this.firebaseService.getActiveAdmins();
    console.log('Loaded active admins:', this.admins);
  }

  async loadColleges() {
    this.colleges = await this.firebaseService.getColleges();
    console.log('Loaded colleges:', this.colleges);
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
    // Clear the password fields when editing
    this.adminForm.get('currentPassword')?.setValue('');
    this.adminForm.get('newPassword')?.setValue('');
    // Make the RUT field read-only when editing
    this.adminForm.get('rut')?.disable();
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
        const formData = this.adminForm.getRawValue(); // This gets all form values, including disabled fields
        
        if (this.isEditing) {
          // Updating existing admin
          if (formData.currentPassword && formData.newPassword) {
            // If new password and current password are provided, update the password
            await this.firebaseService.updatePassword(formData.Email, formData.currentPassword, formData.newPassword);
            console.log('Password updated successfully');
          }
          delete formData.currentPassword;
          delete formData.newPassword;
          await this.firebaseService.updateAdmin(formData);
          console.log('Admin data updated successfully');
        } else {
          // Creating new admin
          if (!formData.newPassword) {
            alert('Password is required for new admin creation');
            return;
          }
          formData.password = formData.newPassword;
          delete formData.currentPassword;
          delete formData.newPassword;
          await this.firebaseService.addAdmin(formData);
          console.log('New admin created successfully');
        }
        
        this.adminForm.reset();
        this.isEditing = false;
        this.editingAdminId = null;
        this.adminForm.get('rut')?.enable();
        this.loadAdmins();
        alert('Admin saved successfully');
      } catch (error) {
        console.error('Error saving admin:', error);
        if (error instanceof Error) {
          alert(`Error saving admin: ${error.message}`);
        } else {
          alert('An unexpected error occurred while saving the admin.');
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
        alert('Your college assignment has been updated.');
      }
    }
  }

  async deactivateAdmin(admin: AdminData) {
    if (confirm(`Are you sure you want to deactivate ${admin.nombre} ${admin.apellido}?`)) {
      try {
        await this.firebaseService.deactivateAdmin(admin.rut);
        alert('Admin deactivated successfully');
        this.loadAdmins(); // This will now load only active admins by default
      } catch (error) {
        console.error('Error deactivating admin:', error);
        alert('Error deactivating admin');
      }
    }
  }

  async activateAdmin(admin: AdminData) {
    if (confirm(`Are you sure you want to activate ${admin.nombre} ${admin.apellido}?`)) {
      try {
        await this.firebaseService.activateAdmin(admin.rut);
        alert('Admin activated successfully');
        this.loadAdmins(); // This will now load only active admins by default
      } catch (error) {
        console.error('Error activating admin:', error);
        alert('Error activating admin');
      }
    }
  }
}
