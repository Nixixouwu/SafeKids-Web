import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FirebaseService } from '../../services/firebase.service';
import { Observable } from 'rxjs';
import { User } from '@angular/fire/auth';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
  user$: Observable<User | null>;
// Constructor del componente
  constructor(private firebaseService: FirebaseService) {
    this.user$ = this.firebaseService.getCurrentUser();
  }
// Método para inicializar el componente
  ngOnInit() {}
// Método para cerrar sesión
  logout() {
    this.firebaseService.signOut();
  }
}
