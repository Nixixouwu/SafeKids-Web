import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { ContactComponent } from './pages/contact/contact.component';
import { RegisterComponent } from './pages/register/register.component';
import { LoginComponent } from './pages/login/login.component';
import { AdminPanelComponent } from './pages/admin-panel/admin-panel.component';
import { CollegesComponent } from './pages/admin-panel/colleges/colleges.component';
import { ParentComponent } from './pages/admin-panel/parent/parent.component';
import { StudentComponent } from './pages/admin-panel/student/student.component';
import { AuthGuard } from './services/auth.guard';
import { AdminComponent } from './pages/admin-panel/admin/admin.component';  // Make sure this import is correct

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'login', component: LoginComponent },
  {
    path: 'panel',
    component: AdminPanelComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'colegios', pathMatch: 'full' },
      { path: 'colegios', component: CollegesComponent },
      { path: 'apoderados', component: ParentComponent },
      { path: 'alumnos', component: StudentComponent },
      { path: 'administradores', component: AdminComponent },
    ]
  }
];
