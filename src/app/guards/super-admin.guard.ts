import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable, from } from 'rxjs';
import { FirebaseService } from '../services/firebase.service';
import { map, switchMap, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SuperAdminGuard implements CanActivate {
  constructor(private firebaseService: FirebaseService, private router: Router) {}
// Método para verificar si el usuario es super administrador
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.firebaseService.getCurrentUser().pipe(
      take(1),
      switchMap(user => {
        if (user) {
          return from(this.firebaseService.getAdminData(user)).pipe(
            map(adminData => {
              if (adminData?.isSuperAdmin) {
                return true;
              } else {
                return this.router.createUrlTree(['/panel/alumnos']);
              }
            })
          );
        } else {
          return from(Promise.resolve(this.router.createUrlTree(['/login'])));
        }
      })
    );
  }
}
