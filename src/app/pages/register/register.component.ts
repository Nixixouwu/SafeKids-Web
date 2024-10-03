import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../components/header/header.component';
import { rutValidator } from '../../validators/rut.validator';
import { RutFormatterDirective } from '../../validators/rut-formatter.validator';

interface College {
  id: string;
  Nombre: string;  // Changed from 'nombre' to 'Nombre'
}

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HeaderComponent, RutFormatterDirective]
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  errorMessage: string = '';
  colleges: any[] = [];

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      rut: ['', [Validators.required, rutValidator()]],
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      telefono: ['', Validators.required],
      fk_adcolegio: ['', Validators.required],
      terms: [false, Validators.requiredTrue] // This ensures the checkbox must be checked
    });
  }

  async ngOnInit() {
    try {
      this.colleges = await this.firebaseService.getColleges();
    } catch (error) {
      console.error('Error fetching colleges:', error);
      this.errorMessage = 'Error loading colleges. Please try again.';
    }
  }

  async onSubmit() {
    if (this.registerForm.valid) {
      const { email, password, terms, ...adminData } = this.registerForm.value;
      try {
        await this.firebaseService.registerAdmin(email, password, adminData);
        this.router.navigate(['/login']);
      } catch (error) {
        console.error('Registration error:', error);
        this.errorMessage = 'Error registering admin. Please try again.';
      }
    }
  }
}
