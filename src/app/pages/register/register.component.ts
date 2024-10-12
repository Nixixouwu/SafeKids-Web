import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../components/header/header.component';
import { rutValidator } from '../../validators/rut.validator';
import { RutFormatterDirective } from '../../validators/rut-formatter.validator';
import { NumbersOnlyDirective } from '../../validators/numbers-only.validator';
import { HttpClient, HttpClientModule } from '@angular/common/http';

interface College {
  id: string;
  Nombre: string;
}

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HeaderComponent, RutFormatterDirective, NumbersOnlyDirective, HttpClientModule]
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  errorMessage: string = '';
  showErrorCloud: boolean = false;
  colleges: any[] = [];

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService,
    private router: Router,
    private http: HttpClient
  ) {
    this.registerForm = this.fb.group({
      rut: ['', [Validators.required, rutValidator()]],
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telefono: ['', [Validators.required, Validators.pattern('^[0-9]*$')]],
      fk_adcolegio: ['', Validators.required],
      terms: [false, Validators.requiredTrue]
    });
  }

  async ngOnInit() {
    try {
      this.colleges = await this.firebaseService.getColleges();
    } catch (error) {
      console.error('Error fetching colleges:', error);
      this.errorMessage = 'Error loading colleges. Please try again.';
      this.showErrorCloud = true;
    }
  }

  async onSubmit() {
    this.showErrorCloud = false;
    this.errorMessage = '';

    if (this.registerForm.invalid) {
      this.showErrorCloud = true;
      
      if (this.registerForm.get('rut')?.invalid) {
        this.errorMessage = 'Por favor, ingrese un RUT válido.';
      } else if (this.registerForm.get('nombre')?.invalid) {
        this.errorMessage = 'Por favor, ingrese su nombre.';
      } else if (this.registerForm.get('apellido')?.invalid) {
        this.errorMessage = 'Por favor, ingrese su apellido.';
      } else if (this.registerForm.get('email')?.invalid) {
        this.errorMessage = 'Por favor, ingrese un correo electrónico válido.';
      } else if (this.registerForm.get('telefono')?.invalid) {
        this.errorMessage = 'Por favor, ingrese un número de teléfono válido.';
      } else if (this.registerForm.get('fk_adcolegio')?.invalid) {
        this.errorMessage = 'Por favor, seleccione un instituto educacional.';
      } else if (this.registerForm.get('terms')?.invalid) {
        this.errorMessage = 'Debe aceptar los términos y condiciones para continuar.';
      } else {
        this.errorMessage = 'Por favor, complete todos los campos correctamente.';
      }
      
      return;
    }

    const formspreeUrl = 'https://formspree.io/f/movagekg'; // Replace with your Formspree form ID
    const formData = this.registerForm.value;

    try {
      const response = await this.http.post(formspreeUrl, formData).toPromise();
      console.log('Form submitted successfully', response);
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error submitting form:', error);
      this.errorMessage = 'Error al enviar la solicitud. Por favor, inténtelo de nuevo.';
      this.showErrorCloud = true;
    }
  }
}
