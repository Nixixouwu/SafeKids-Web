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
  adminName$: Observable<string>;
  isSuperAdmin$: Observable<boolean>;
  currentAdminCollege$: Observable<string | null>;

  constructor(private firebaseService: FirebaseService, private router: Router) {
    const adminData$ = this.firebaseService.getCurrentUser().pipe(
      switchMap(user => user ? this.firebaseService.getAdminData(user) : of(null))
    );

    this.adminName$ = adminData$.pipe(
      map(adminData => adminData ? `${adminData.nombre} ${adminData.apellido}` : '')
    );

    this.isSuperAdmin$ = adminData$.pipe(
      map(adminData => adminData?.isSuperAdmin || false)
    );

    this.currentAdminCollege$ = adminData$.pipe(
      map(adminData => adminData?.fk_adcolegio || null)
    );
  }

  ngOnInit() {
    this.adminName$.subscribe(name => {
      console.log('Current admin:', name);
    });
  }

  logout() {
    this.firebaseService.signOut().then(() => {
      this.router.navigate(['/login']);
    });
  }
}
