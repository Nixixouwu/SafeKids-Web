import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
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

  constructor(private firebaseService: FirebaseService, private router: Router) {
    this.adminName$ = this.firebaseService.getCurrentUser().pipe(
      switchMap(user => {
        if (user) {
          return this.firebaseService.getAdminData(user.uid);
        }
        return [];
      }),
      map(adminData => adminData ? `${adminData.nombre} ${adminData.apellido}` : '')
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
