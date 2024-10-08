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
    private router: Router,
    private firebaseService: FirebaseService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  async onSubmit() {
    this.showErrorCloud = false;
    this.errorMessage = '';

    if (this.loginForm.valid) {
      try {
        const { email, password } = this.loginForm.value;
        await this.firebaseService.signIn(email, password);
        this.router.navigate(['/panel']);
      } catch (error) {
        console.error('Login error:', error);
        this.handleLoginError(error);
      }
    } else {
      this.errorMessage = 'Por favor, complete todos los campos correctamente.';
      this.showErrorCloud = true;
    }
  }

  private handleLoginError(error: any) {
    this.showErrorCloud = true;
    if (error instanceof FirebaseError) {
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
      this.errorMessage = 'Ha ocurrido un error inesperado. Por favor, inténtelo de nuevo.';
    }
  }
}
