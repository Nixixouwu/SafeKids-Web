import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { ContactComponent } from './pages/contact/contact.component';
import { RegisterComponent } from './pages/register/register.component';
import { LoginComponent } from './pages/login/login.component';
import { AdminPanelComponent } from './pages/admin-panel/admin-panel.component';
import { ParentComponent } from './pages/admin-panel/parent/parent.component';
import { StudentComponent } from './pages/admin-panel/student/student.component';
import { AuthGuard } from './guards/auth.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { CollegesComponent } from './pages/admin-panel/colleges/colleges.component';
import { AdminComponent } from './pages/admin-panel/admin/admin.component';
import { ConductorComponent } from './pages/admin-panel/conductor/conductor.component'; // Importación del componente de conductores
import { BusComponent } from './pages/admin-panel/bus/bus.component'; // Importación del componente de buses

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
      { path: '', redirectTo: 'alumnos', pathMatch: 'full' },
      { path: 'colegios', component: CollegesComponent, canActivate: [SuperAdminGuard] },
      { path: 'apoderados', component: ParentComponent },
      { path: 'alumnos', component: StudentComponent },
      { path: 'administradores', component: AdminComponent, canActivate: [SuperAdminGuard] },
      { path: 'conductores', component: ConductorComponent },
      { path: 'buses', component: BusComponent }, // Ruta para el componente de buses
    ]
  }
];
