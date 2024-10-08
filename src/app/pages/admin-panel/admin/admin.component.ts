import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FirebaseService, AdminData, College } from '../../../services/firebase.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {
  adminForm: FormGroup;
  admins: AdminData[] = [];
  colleges: College[] = [];  // Add this line

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService
  ) {
    this.adminForm = this.fb.group({
      rut: ['', [Validators.required, Validators.maxLength(20)]],
      nombre: ['', [Validators.required, Validators.maxLength(20)]],
      apellido: ['', [Validators.required, Validators.maxLength(20)]],
      Email: ['', [Validators.required, Validators.email, Validators.maxLength(50)]],
      telefono: ['', [Validators.required, Validators.maxLength(20)]],
      fk_adcolegio: ['', Validators.required],
      Rol: ['Admin', Validators.required]
    });
  }

  ngOnInit() {
    this.loadAdmins();
    this.loadColleges();  // Add this line
  }

  async loadAdmins() {
    this.admins = await this.firebaseService.getAdmins();
    console.log('Loaded admins:', this.admins);
  }

  async loadColleges() {  // Add this method
    this.colleges = await this.firebaseService.getColleges();
    console.log('Loaded colleges:', this.colleges);
  }

  async onSubmit() {
    if (this.adminForm.valid) {
      const adminData = this.adminForm.value;
      try {
        // Assuming you'll add a method to add/update admin in FirebaseService
        await this.firebaseService.addOrUpdateAdmin(adminData);
        console.log('Admin saved successfully');
        this.adminForm.reset({ Rol: 'Admin' });
        this.loadAdmins();
      } catch (error) {
        console.error('Error submitting admin:', error);
      }
    } else {
      console.log('Form is invalid', this.adminForm.errors);
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
  }

  async deleteAdmin(admin: AdminData) {
    if (confirm('¿Estás seguro de que quieres eliminar este administrador?')) {
      try {
        await this.firebaseService.deleteAdmin(admin.Email);
        console.log('Admin deleted successfully');
        this.loadAdmins();
      } catch (error) {
        console.error('Error deleting admin:', error);
        // Handle the error (e.g., show an error message to the user)
      }
    }
  }

  getCollegeName(collegeId: string): string {
    const college = this.colleges.find(c => c.id === collegeId);
    return college ? college.Nombre : 'N/A';
  }
}
