import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FirebaseService, AdminData, College } from '../../../services/firebase.service';
import { CommonModule } from '@angular/common';
import { NumbersOnlyDirective } from '../../../validators/numbers-only.validator';  // Add this import
import { FirebaseError } from '@angular/fire/app';  // Add this import

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NumbersOnlyDirective],  // Add NumbersOnlyDirective here
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
      password: ['', [Validators.required, Validators.minLength(6)]], // Add this line
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
      const { Email, password, ...adminData } = this.adminForm.value; // Update this line
      try {
        // Use the password from the form instead of generating a random one
        await this.firebaseService.registerAdminFromPanel(Email, password, adminData);
        
        console.log('Admin saved successfully');
        this.adminForm.reset({ Rol: 'Admin' });
        this.loadAdmins();
        
        // Success alert removed from here
      } catch (error) {
        console.error('Error submitting admin:', error);
        if (error instanceof FirebaseError) {
          switch (error.code) {
            case 'auth/email-already-in-use':
              alert('This email is already in use. Please use a different email.');
              break;
            default:
              alert('An error occurred while creating the admin account. Please try again.');
          }
        } else {
          alert('An unexpected error occurred. Please try again.');
        }
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
    // Clear the password field when editing
    this.adminForm.get('password')?.setValue('');
  }

  getCollegeName(collegeId: string): string {
    const college = this.colleges.find(c => c.id === collegeId);
    return college ? college.Nombre : 'N/A';
  }
}
