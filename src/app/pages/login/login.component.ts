import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { HeaderComponent } from '../../components/header/header.component';
import { FirebaseError } from '@angular/fire/app';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HeaderComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  // Variables principales para el manejo del formulario y mensajes de error
  loginForm: FormGroup;
  errorMessage: string = '';
  showErrorCloud: boolean = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private firebaseService: FirebaseService
  ) {
    // Inicialización del formulario de login con validaciones básicas
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  // Método principal para manejar el envío del formulario de login
  async onSubmit() {
    this.showErrorCloud = false;
    this.errorMessage = '';

    if (this.loginForm.valid) {
      try {
        // Extrae las credenciales del formulario e intenta iniciar sesión
        const { email, password } = this.loginForm.value;
        await this.firebaseService.signIn(email, password);
        this.router.navigate(['/panel']);
      } catch (error) {
        // Si hay un error, lo maneja a través del método especializado
        this.handleLoginError(error);
      }
    } else {
      // Mensaje de error si el formulario no es válido
      this.errorMessage = 'Por favor, complete todos los campos correctamente.';
      this.showErrorCloud = true;
    }
  }

  // Método especializado para manejar los diferentes tipos de errores de autenticación
  private handleLoginError(error: any) {
    this.showErrorCloud = true;
    if (error instanceof FirebaseError) {
      // Manejo de errores específicos de Firebase Authentication
      switch (error.code) {
        case 'auth/invalid-credential':
          this.errorMessage = 'Credenciales inválidas. Por favor, verifique su correo electrónico y contraseña.';
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          this.errorMessage = 'Correo electrónico o contraseña incorrectos. Por favor, inténtelo de nuevo.';
          break;
        case 'auth/too-many-requests':
          this.errorMessage = 'Demasiados intentos fallidos. Por favor, inténtelo más tarde.';
          break;
        default:
          this.errorMessage = 'Ha ocurrido un error durante el inicio de sesión. Por favor, inténtelo de nuevo.';
      }
    } else {
      // Manejo de errores no específicos de Firebase
      this.errorMessage = 'Ha ocurrido un error inesperado. Por favor, inténtelo de nuevo.';
    }
  }
}
