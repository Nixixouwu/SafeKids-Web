import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { FirebaseService } from './firebase.service';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
//Guardia de autenticación
export class AuthGuard implements CanActivate {
  constructor(private firebaseService: FirebaseService, private router: Router) {}
  //Verifica si el usuario está autenticado
  canActivate(): Observable<boolean> {
    return this.firebaseService.getCurrentUser().pipe(
      take(1),
      map(user => {
        if (user) {
          return true;
        } else {
          this.router.navigate(['/login']);
          return false;
        }
      })
    );
  }
}