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
    // Inicializa el formulario de registro con validaciones
    this.registerForm = this.fb.group({
      rut: ['', [Validators.required, rutValidator()]],
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telefono: ['', [Validators.required, Validators.pattern('^[0-9]*$')]],
      fk_adcolegio: ['', Validators.required]
    });
  }

  // Carga la lista de colegios al iniciar el componente
  async ngOnInit() {
    try {
      this.colleges = await this.firebaseService.getColleges();
    } catch (error) {
      this.errorMessage = 'Error loading colleges. Please try again.';
      this.showErrorCloud = true;
    }
  }

  // Maneja el envío del formulario de registro
  async onSubmit() {
    this.showErrorCloud = false;
    this.errorMessage = '';

    // Verifica si el formulario es válido y muestra mensajes de error específicos
    if (this.registerForm.invalid) {
      this.showErrorCloud = true;
      
      // Validaciones específicas para cada campo del formulario
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
      } else {
        this.errorMessage = 'Por favor, complete todos los campos correctamente.';
      }
      
      return;
    }

    // Obtener los datos del formulario
    const formData = this.registerForm.value;
    
    // Buscar el nombre del colegio usando el ID seleccionado
    const selectedCollege = this.colleges.find(
      college => college.id === formData.fk_adcolegio
    );
    
    // Crear un nuevo objeto con el nombre del colegio en lugar de ID
    const formDataToSend = {
      ...formData,
      fk_adcolegio: selectedCollege ? selectedCollege.Nombre : 'Unknown College'
    };

    // Enviar a Formspree
    const formspreeUrl = 'https://formspree.io/f/movagekg';
    
    try {
      const response = await this.http.post(formspreeUrl, formDataToSend).toPromise();
      this.router.navigate(['/login']);
    } catch (error) {
      this.errorMessage = 'Error al enviar la solicitud. Por favor, inténtelo de nuevo.';
      this.showErrorCloud = true;
    }
  }
}
