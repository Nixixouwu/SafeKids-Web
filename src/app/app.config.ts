import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { environment } from '../environments/environment';
import { AuthGuard } from './guards/auth.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes), // Configuración del enrutador
    provideFirebaseApp(() => initializeApp(environment.firebase)), // Configuración de Firebase
    provideFirestore(() => getFirestore()), // Configuración de Firestore
    provideAuth(() => getAuth()), // Configuración de Auth
    provideStorage(() => getStorage()), // Configuración de Storage
    AuthGuard, // Guardia de autenticación
    SuperAdminGuard // Guardia de superadmin
  ]
};
