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
  loginForm: FormGroup;
  errorMessage: string = '';
  showErrorCloud: boolean = false;

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  async onSubmit() {
    this.showErrorCloud = false;
    this.errorMessage = '';

    if (this.loginForm.invalid) {
      this.errorMessage = 'Por favor, complete todos los campos correctamente.';
      this.showErrorCloud = true;
      return;
    }

    const email = this.loginForm.get('email')?.value;
    const password = this.loginForm.get('password')?.value;

    try {
      await this.firebaseService.signIn(email, password);
      this.router.navigate(['/panel']);
    } catch (error) {
      console.error('Login error:', error);
      await this.handleLoginError(error, email);
      this.showErrorCloud = true;
    }
  }

  private async handleLoginError(error: any, email: string) {
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'auth/invalid-credential':
          // Check if the email exists in the Admin collection
          const emailExists = await this.firebaseService.checkEmailExists(email);
          if (emailExists) {
            this.errorMessage = 'La contraseña es incorrecta.';
          } else {
            this.errorMessage = 'El correo electrónico no está registrado en el sistema.';
          }
          break;
        case 'auth/user-disabled':
          this.errorMessage = 'Esta cuenta ha sido deshabilitada.';
          break;
        case 'auth/too-many-requests':
          this.errorMessage = 'Demasiados intentos fallidos. Por favor, inténtelo más tarde.';
          break;
        default:
          this.errorMessage = 'Ha ocurrido un error durante el inicio de sesión. Por favor, inténtelo de nuevo.';
      }
    } else {
      this.errorMessage = 'Ha ocurrido un error inesperado. Por favor, inténtelo de nuevo.';
    }
  }
}
