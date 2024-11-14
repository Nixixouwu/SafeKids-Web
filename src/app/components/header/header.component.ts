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
  styleUrl: './header.component.scss',
  exportAs: 'header'
})
export class HeaderComponent implements OnInit {
  user$: Observable<User | null>;
  isMenuCollapsed = true;

  constructor(private firebaseService: FirebaseService) {
    this.user$ = this.firebaseService.getCurrentUser();
  }

  ngOnInit() {}

  toggleMenu() {
    this.isMenuCollapsed = !this.isMenuCollapsed;
    document.querySelector('.home-container')?.classList.toggle('menu-open', !this.isMenuCollapsed);
    document.querySelector('.container-login')?.classList.toggle('menu-open', !this.isMenuCollapsed);
    document.querySelector('.container-register')?.classList.toggle('menu-open', !this.isMenuCollapsed);
  }

  logout() {
    this.firebaseService.signOut();
  }
}
