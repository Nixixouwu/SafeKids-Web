import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HeaderComponent } from '../../components/header/header.component';
import { CommonModule } from '@angular/common';
import { NumbersOnlyDirective } from '../../validators/numbers-only.validator';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [
    HeaderComponent,
    ReactiveFormsModule,
    CommonModule,
    NumbersOnlyDirective,
    HttpClientModule
  ],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss'
})
export class ContactComponent implements OnInit {
  // Variables principales para el manejo del formulario y estados
  contactForm!: FormGroup;
  formSubmitted = false;  // Indica si el formulario fue enviado exitosamente
  formError = false;      // Indica si hubo un error al enviar el formulario

  constructor(private fb: FormBuilder, private http: HttpClient) {}

  // Inicialización del componente y configuración del formulario
  ngOnInit() {
    // Creación del formulario con validaciones
    this.contactForm = this.fb.group({
      name: ['', Validators.required],                           // Nombre obligatorio
      email: ['', [Validators.required, Validators.email]],      // Email obligatorio y válido
      institution: ['', Validators.required],                    // Institución obligatoria
      phone: ['', [Validators.pattern('^[0-9]*$')]],            // Teléfono solo números
      message: ['', Validators.required]                         // Mensaje obligatorio
    });
  }

  // Método para manejar el envío del formulario de contacto
  onSubmit() {
    if (this.contactForm.valid) {
      // URL de Formspree para el envío del formulario
      const formspreeUrl = 'https://formspree.io/f/movagekg';
      
      // Envío del formulario a través de Formspree
      this.http.post(formspreeUrl, this.contactForm.value)
        .subscribe(
          // Manejo de respuesta exitosa
          response => {
            this.formSubmitted = true;
            this.contactForm.reset();
          },
          // Manejo de errores en el envío
          error => {
            this.formError = true;
          }
        );
    }
  }
}
