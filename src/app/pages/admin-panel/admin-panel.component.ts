import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { FirebaseService, AdminData } from '../../services/firebase.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.scss'
})
export class AdminPanelComponent implements OnInit {
  // Observables para manejar la información del administrador
  adminName$: Observable<string>;                    // Nombre completo del administrador
  isSuperAdmin$: Observable<boolean>;               // Indica si es super administrador
  currentAdminCollege$: Observable<string | null>;  // ID del colegio asignado al administrador

  constructor(private firebaseService: FirebaseService, private router: Router) {
    // Observable principal que obtiene los datos del administrador actual
    const adminData$ = this.firebaseService.getCurrentUser().pipe(
      switchMap(user => user ? this.firebaseService.getAdminData(user) : of(null))
    );

    // Observable que combina nombre y apellido del administrador
    this.adminName$ = adminData$.pipe(
      map(adminData => adminData ? `${adminData.nombre} ${adminData.apellido}` : '')
    );

    // Observable que determina si el usuario es super administrador
    this.isSuperAdmin$ = adminData$.pipe(
      map(adminData => adminData?.isSuperAdmin || false)
    );

    // Observable que obtiene el ID del colegio asignado al administrador
    this.currentAdminCollege$ = adminData$.pipe(
      map(adminData => adminData?.fk_adcolegio || null)
    );
  }

  // Inicialización del componente
  ngOnInit() {
    // Suscripción al nombre del administrador para verificar la carga de datos
    this.adminName$.subscribe(name => {
    });
  }

  // Método para cerrar sesión y redirigir al login
  logout() {
    this.firebaseService.signOut().then(() => {
      this.router.navigate(['/login']);
    });
  }
}
