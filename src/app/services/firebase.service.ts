import { Injectable } from '@angular/core';
import { Auth, deleteUser, getAuth, signInWithEmailAndPassword, User, createUserWithEmailAndPassword, signOut, user, updatePassword, UserCredential, reauthenticateWithCredential, EmailAuthProvider } from '@angular/fire/auth';
import { Firestore, doc, deleteDoc, collection, query, where, getDocs, getDoc, setDoc, addDoc, updateDoc, orderBy, limit } from '@angular/fire/firestore';
import { FirebaseApp, deleteApp, FirebaseError, getApp, initializeApp } from '@angular/fire/app';
import { Observable } from 'rxjs';

export interface AdminData {
  Email: string;
  Rol: string;
  apellido: string;
  fk_adcolegio: string;
  nombre: string;
  rut: string;
  telefono: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  password?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface College {
  id: string;
  Direccion: string;
  Email: string;
  Encargado: string;
  Nombre: string;
  Telefono: string;
}

export interface Alumno {
  id?: string;
  Apellido: string;
  Curso: string;
  Direccion: string;
  Edad: number;
  FK_ALApoderado: string;
  FK_ALColegio: string;
  Genero: string;
  Imagen: string;
  Nombre: string;
  RUT: string;
}

export interface Apoderado {
  id?: string;
  Apellido: string;
  Email: string;
  FK_APColegio: string;
  Imagen: string;
  Nombre: string;
  RUT: string;
  Telefono: string;
}

export interface Conductor {
  RUT: string;
  Nombre: string;
  Imagen: string;
  Fecha_Admision: string;
  FK_COColegio: string;
  FK_COBus: string;
  Apellido: string;
  Email: string;
  Edad: number;
  Direccion: string;
}

export interface Bus {
  FK_BUColegio: string;
  FK_BUConductor: string;
  ID_Placa: string;
  Imagen: string;
  Modelo: string;
}

@Injectable({
  providedIn: 'root'
})
//Servicio de Firebase
export class FirebaseService {
  private adminApp: FirebaseApp | null = null;
  //Constructor del servicio
  constructor(
    private auth: Auth,
    private firestore: Firestore
  ) {}
  //Obtiene la aplicación de administrador
  private getAdminApp(): FirebaseApp {
    if (!this.adminApp) {
      try {
        this.adminApp = getApp('adminApp');
      } catch (e) {
        this.adminApp = initializeApp(getApp().options, 'adminApp');
      }
    }
    return this.adminApp;
  }
  //Inicia sesión en la aplicación de administrador
  async signIn(email: string, password: string) {
    const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
    const user = userCredential.user;

    const adminDoc = await this.getAdminByEmail(email);
    if (!adminDoc || !adminDoc.isActive) {
      await signOut(this.auth);
      throw new Error('Admin account is not active');
    }

    return userCredential;
  }
  //Cierra sesión en la aplicación
  signOut() {
    return signOut(this.auth);
  }
  //Obtiene el usuario actual
  getCurrentUser(): Observable<User | null> {
    return new Observable((observer) => {
      return this.auth.onAuthStateChanged(observer);
    });
  }
  //Verifica si el usuario es administrador
  async isUserAdmin(uid: string): Promise<boolean> {
    const adminDocRef = doc(this.firestore, `Admin/${uid}`);
    const adminDoc = await getDoc(adminDocRef);
    if (adminDoc.exists()) {
      const data = adminDoc.data() as AdminData;
      return data.Rol === 'Admin';
    }
    return false;
  }
  //Obtiene los datos del administrador
  async getAdminData(user: User): Promise<AdminData | null> {
    const adminCollection = collection(this.firestore, 'Admin');
    const q = query(adminCollection, where('Email', '==', user.email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const adminDoc = querySnapshot.docs[0];
      const data = adminDoc.data() as Omit<AdminData, 'rut'>;
      return {
        ...data,
        rut: adminDoc.id, // Use the document ID as the RUT
        isSuperAdmin: data.isSuperAdmin || false
      };
    } else {
      return null;
    }
  }
  //Registra un administrador
  async registerAdmin(email: string, password: string, adminData: Omit<AdminData, 'Email'>): Promise<void> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(this.firestore, `Admin/${user.uid}`), {
        ...adminData,
        Email: email,
        Rol: 'Admin'
      });
      // Sign out the user immediately after registration
      await this.auth.signOut();
    } catch (error) {
      if (error instanceof FirebaseError && error.code === 'auth/email-already-in-use') {
        throw error; // Re-throw the Firebase error to be caught in the component
      }
      throw new Error('Failed to register admin');
    }
  }
  //Registra un administrador desde el panel
  async registerAdminFromPanel(email: string, password: string, adminData: Omit<AdminData, 'Email'>): Promise<void> {
    try {
      const app = this.getAdminApp();
      const adminAuth = getAuth(app);
      
      // Create the auth account without signing in
      const userCredential = await createUserWithEmailAndPassword(adminAuth, email, password);

      // Add the admin data to Firestore using RUT as the document ID
      const adminDoc = doc(this.firestore, `Admin/${adminData.rut}`);
      await setDoc(adminDoc, {
        ...adminData,
        Email: email
      });

      // Sign out the user from the admin app
      await adminAuth.signOut();
    } catch (error) {
      throw error;
    }
  }

  //Obtiene los colegios
  async getColleges(): Promise<College[]> {
    const collegesCollection = collection(this.firestore, 'Colegio');
    const collegesSnapshot = await getDocs(collegesCollection);
    return collegesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as College));
  }
  //Genera un ID a partir del nombre
  private generateIdFromName(name: string): string {
    //Elimina caracteres especiales, convierte a minúsculas y elimina espacios
    let id = name.toLowerCase()
      .replace(/[áäâà]/g, 'a')
      .replace(/[éëêè]/g, 'e')
      .replace(/[íïîì]/g, 'i')
      .replace(/[óöôò]/g, 'o')
      .replace(/[úüûù]/g, 'u')
      .replace(/ñ/g, 'n')
      .replace(/[^a-z0-9]/g, '') //Elimina todos los caracteres no alfanuméricos
      .replace(/\s+/g, '');      //Elimina todos los espacios
    
    //Limita la longitud a 10 caracteres
    id = id.slice(0, 10);
    
    return id;
  }
  //Obtiene el ID del colegio siguiente
  private async getNextCollegeId(): Promise<number> {
    const collegesRef = collection(this.firestore, 'Colegio');
    const q = query(collegesRef, orderBy('id', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return 1; //Inicia con 1 si no hay colegios
    } else {
      const highestIdDoc = querySnapshot.docs[0].data() as College;
      return parseInt(highestIdDoc.id) + 1;
    }
  }

  //Agrega un colegio
  async addCollege(collegeData: Omit<College, 'id' | 'ID'>): Promise<number> {
    try {
      const newId = await this.getNextCollegeId();
      const newCollegeRef = doc(this.firestore, 'Colegio', newId.toString());
      
      const newCollege: College = {
        ...collegeData,
        id: newId.toString()
      };

      await setDoc(newCollegeRef, newCollege);

      return newId;
    } catch (e) {
      throw e;
    }
  }

  //Actualiza un colegio
  async updateCollege(collegeData: College): Promise<void> {
    const { id, ...updateData } = collegeData;
    const collegeDoc = doc(this.firestore, `Colegio/${id}`);
    await updateDoc(collegeDoc, updateData);
  }

  //Elimina un colegio
  async deleteCollege(id: string): Promise<void> {
    const collegeDoc = doc(this.firestore, `Colegio/${id}`);
    await deleteDoc(collegeDoc);
  }

  //Obtiene los alumnos
  async getAlumnos(): Promise<Alumno[]> {
    const alumnosCollection = collection(this.firestore, 'Alumnos');
    const alumnosSnapshot = await getDocs(alumnosCollection);
    return alumnosSnapshot.docs.map(doc => doc.data() as Alumno);
  }

  //Agrega o actualiza un alumno
  async addOrUpdateAlumno(alumnoData: Alumno): Promise<void> {
    const alumnoDoc = doc(this.firestore, 'Alumnos', alumnoData.RUT);
    await setDoc(alumnoDoc, alumnoData, { merge: true });
  }

  //Elimina un alumno
  async deleteAlumno(rut: string): Promise<void> {
    const alumnoDoc = doc(this.firestore, 'Alumnos', rut);
    await deleteDoc(alumnoDoc);
  }

  //Obtiene los apoderados
  async getApoderados(): Promise<Apoderado[]> {
    const apoderadosCollection = collection(this.firestore, 'Apoderado');
    const apoderadosSnapshot = await getDocs(apoderadosCollection);
    return apoderadosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Apoderado));
  }

  //Agrega o actualiza un apoderado
  async addOrUpdateApoderado(apoderadoData: Apoderado): Promise<void> {
    const apoderadoDoc = doc(this.firestore, 'Apoderado', apoderadoData.RUT);
    await setDoc(apoderadoDoc, apoderadoData, { merge: true });
  }

  //Elimina un apoderado
  async deleteApoderado(rut: string): Promise<void> {
    const apoderadoDoc = doc(this.firestore, 'Apoderado', rut);
    await deleteDoc(apoderadoDoc);
  }

  //Verifica si el email ya existe
  async checkEmailExists(email: string): Promise<boolean> {
    const adminCollection = collection(this.firestore, 'Admin');
    const q = query(adminCollection, where('Email', '==', email));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  }

  //Obtiene los administradores
  async getAdmins(): Promise<AdminData[]> {
    const adminsCollection = collection(this.firestore, 'Admin');
    const adminsSnapshot = await getDocs(adminsCollection);
    return adminsSnapshot.docs.map(doc => {
      const data = doc.data() as Omit<AdminData, 'rut'>;
      return {
        ...data,
        rut: doc.id //Usa el ID del documento como RUT
      };
    });
  }

  //Agrega o actualiza un administrador
  async addOrUpdateAdmin(adminData: AdminData): Promise<void> {
    if (!adminData.rut) {
      throw new Error('RUT is required for admin creation or update');
    }

    const adminDoc = doc(this.firestore, `Admin/${adminData.rut}`);
    const existingAdmin = await getDoc(adminDoc);

    const app = this.getAdminApp();
    const adminAuth = getAuth(app);

    if (!existingAdmin.exists()) {
      //Nuevo administrador: crea la cuenta de autenticación y el documento en Firestore
      try {
        if (!adminData.password) {
          throw new Error('Password is required for new admin creation');
        }
        const userCredential = await createUserWithEmailAndPassword(adminAuth, adminData.Email, adminData.password);
        
        const { password, ...adminDataWithoutPassword } = adminData;
        await setDoc(adminDoc, {
          ...adminDataWithoutPassword,
          isActive: true
        });

      } catch (error) {
        throw error;
      }
    } else {
      //Administrador existente: actualiza el documento en Firestore
      try {
        const { password, ...adminDataWithoutPassword } = adminData;
        await updateDoc(adminDoc, adminDataWithoutPassword);

        if (password) {
          const adminSnapshot = await getDoc(adminDoc);
          const existingAdminData = adminSnapshot.data() as AdminData;
          const userCredential = await signInWithEmailAndPassword(adminAuth, existingAdminData.Email, password);
          await updatePassword(userCredential.user, password);
          await signOut(adminAuth);
        }

      } catch (error) {
        throw error;
      }
    }
  }

  //Desactiva un administrador
  async deactivateAdmin(rut: string): Promise<void> {
    const adminDoc = doc(this.firestore, `Admin/${rut}`);
    const adminSnapshot = await getDoc(adminDoc);

    if (adminSnapshot.exists()) {
      await updateDoc(adminDoc, {
        isActive: false
      });

    } else {
    }
  }

  //Activa un administrador
  async activateAdmin(rut: string): Promise<void> {
    const adminDoc = doc(this.firestore, `Admin/${rut}`);
    const adminSnapshot = await getDoc(adminDoc);

    if (adminSnapshot.exists()) {
      await updateDoc(adminDoc, {
        isActive: true
      });

    } else {
    }
  }

  //Obtiene los alumnos por colegio
  async getAlumnosByCollege(collegeId: string | null): Promise<Alumno[]> {
    const alumnosCollection = collection(this.firestore, 'Alumnos');
    let q;
    if (collegeId) {
      q = query(alumnosCollection, where('FK_ALColegio', '==', collegeId));
    } else {
      q = query(alumnosCollection);
    }
    const alumnosSnapshot = await getDocs(q);
    const alumnos = alumnosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alumno));
    return alumnos;
  }

  //Obtiene un colegio
  async getCollege(collegeId: string): Promise<College | null> {
    const collegeDoc = doc(this.firestore, `Colegio/${collegeId}`);
    const collegeSnapshot = await getDoc(collegeDoc);
    return collegeSnapshot.exists() ? { id: collegeSnapshot.id, ...collegeSnapshot.data() } as College : null;
  }

  //Obtiene los apoderados por colegio
  async getApoderadosByCollege(collegeId: string | null): Promise<Apoderado[]> {
    const apoderadosCollection = collection(this.firestore, 'Apoderado');
    let q;
    if (collegeId) {
      q = query(apoderadosCollection, where('FK_APColegio', '==', collegeId));
    } else {
      q = query(apoderadosCollection);
    }
    const apoderadosSnapshot = await getDocs(q);
    return apoderadosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Apoderado));
  }

  //Agrega un super administrador
  async addSuperAdmin(adminData: Omit<AdminData, 'isSuperAdmin'>): Promise<void> {
    const adminDocRef = doc(this.firestore, 'Admin', adminData.rut);
    await setDoc(adminDocRef, { ...adminData, isSuperAdmin: true }, { merge: true });
  }

  //Elimina un administrador
  async deleteAdmin(rut: string): Promise<void> {
    const adminDoc = doc(this.firestore, `Admin/${rut}`);
    const adminSnapshot = await getDoc(adminDoc);

    if (adminSnapshot.exists()) {
      const adminData = adminSnapshot.data() as AdminData;
      
      //En lugar de eliminar, marca el administrador como eliminado
      await updateDoc(adminDoc, {
        isDeleted: true,
        deletedAt: new Date()
      });

    } else {
    }
  }

  //Obtiene un administrador por email
  async getAdminByEmail(email: string): Promise<AdminData | null> {
    const adminCollection = collection(this.firestore, 'Admin');
    const q = query(adminCollection, where('Email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const adminDoc = querySnapshot.docs[0];
      const data = adminDoc.data() as Omit<AdminData, 'rut'>;
      return {
        ...data,
        rut: adminDoc.id //Usa el ID del documento como RUT
      };
    }
    return null;
  }

  //Obtiene los administradores activos
  async getActiveAdmins(): Promise<AdminData[]> {
    const adminsCollection = collection(this.firestore, 'Admin');
    const q = query(adminsCollection, where('isActive', '==', true));
    const adminsSnapshot = await getDocs(q);
    return adminsSnapshot.docs.map(doc => {
      const data = doc.data() as Omit<AdminData, 'rut'>;
      return {
        ...data,
        rut: doc.id //Usa el ID del documento como RUT
      };
    });
  }

  //Actualiza un administrador
  async updateAdmin(adminData: AdminData): Promise<void> {
    if (!adminData.rut) {
      throw new Error('RUT is required for admin update');
    }

    try {
      const adminDoc = doc(this.firestore, `Admin/${adminData.rut}`);
      const existingAdmin = await getDoc(adminDoc);

      if (!existingAdmin.exists()) {
        throw new Error('Admin not found');
      }

      //Elimina los campos de contraseña antes de actualizar en Firestore
      const { password, currentPassword, newPassword, ...adminDataToUpdate } = adminData;

      //Actualiza el documento del administrador en Firestore
      await updateDoc(adminDoc, adminDataToUpdate);

      //Si se proporciona una nueva contraseña, actualiza en Firebase Authentication
      if (newPassword && currentPassword) {
        const user = await this.auth.currentUser;
        if (user) {
          const credential = EmailAuthProvider.credential(user.email!, currentPassword);
          await reauthenticateWithCredential(user, credential);
          await updatePassword(user, newPassword);
        }
      }

    } catch (error) {
      throw error;
    }
  }

  //Actualiza la contraseña
  async updatePassword(email: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      //Inicia sesión con la contraseña actual del usuario
      const userCredential = await signInWithEmailAndPassword(this.auth, email, currentPassword);
      
      //Actualiza la contraseña
      await updatePassword(userCredential.user, newPassword);
      
    } catch (error) {
      throw error;
    }
  }
  //Agrega un administrador
  async addAdmin(adminData: AdminData): Promise<void> {
    if (!adminData.rut || !adminData.password) {
      throw new Error('RUT and password are required for admin creation');
    }

    try {
      //Verifica si un administrador con este RUT ya existe
      const adminDoc = doc(this.firestore, `Admin/${adminData.rut}`);
      const existingAdmin = await getDoc(adminDoc);

      if (existingAdmin.exists()) {
        throw new Error('An admin with this RUT already exists');
      }

      //Verifica si un administrador con este email ya existe
      const existingEmailQuery = query(collection(this.firestore, 'Admin'), where('Email', '==', adminData.Email));
      const existingEmailSnapshot = await getDocs(existingEmailQuery);

      if (!existingEmailSnapshot.empty) {
        throw new Error('An admin with this email already exists');
      }

      //Crea una instancia separada de Firebase para la creación de usuario
      const app = initializeApp(getApp().options, 'adminCreationApp');
      const adminAuth = getAuth(app);

      //Crea un usuario en Firebase Authentication sin afectar la sesión actual
      const userCredential = await createUserWithEmailAndPassword(adminAuth, adminData.Email, adminData.password);
      
      //Elimina los campos de contraseña antes de almacenar en Firestore
      const { password, currentPassword, newPassword, ...adminDataToStore } = adminData;

      //Crea el documento del administrador en Firestore
      await setDoc(adminDoc, {
        ...adminDataToStore,
        isActive: true,
        Rol: 'Admin' //Rol por defecto
      });

      //Elimina la aplicación temporal
      await deleteApp(app);

    } catch (error) {
      throw error;
    }
  }

  //Crea un usuario sin iniciar sesión
  private async createUserWithoutSignIn(email: string, password: string): Promise<UserCredential> {
    //Almacena el usuario actual
    const currentUser = this.auth.currentUser;

    //Crea el nuevo usuario
    const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);

    //Si hubo un usuario iniciado sesión antes, inicia sesión de nuevo
    if (currentUser) {
      await this.auth.updateCurrentUser(currentUser);
    } else {
      //Si no hubo un usuario iniciado sesión antes, cierra sesión del usuario nuevo
      await this.auth.signOut();
    }

    return userCredential;
  }

  //Elimina un conductor
  async deleteConductor(rut: string): Promise<void> {
    const conductorDoc = doc(this.firestore, `Conductor/${rut}`);
    await deleteDoc(conductorDoc);
  }

  //Agrega o actualiza un conductor
  async addOrUpdateConductor(conductorData: Conductor) {
    const docRef = doc(this.firestore, 'Conductor', conductorData.RUT);
    return setDoc(docRef, conductorData, { merge: true }); // Usa merge: true para actualizar
  }

  //Obtiene los conductores por colegio
  async getConductores(collegeId: string): Promise<Conductor[]> {
    const conductoresCollection = collection(this.firestore, 'Conductor');
    const q = query(conductoresCollection, where('FK_COColegio', '==', collegeId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Conductor) })); // Asegúrate de incluir todas las propiedades de Conductor
  }

  //Obtiene los conductores por colegio
  async getConductoresByCollege(collegeId: string): Promise<Conductor[]> {
    const conductoresCollection = collection(this.firestore, 'Conductor');
    const q = query(conductoresCollection, where('FK_COColegio', '==', collegeId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Conductor) }));
  }

  // Métodos para manejar buses
  async getBuses(): Promise<Bus[]> {
    const busesCollection = collection(this.firestore, 'Bus');
    const busesSnapshot = await getDocs(busesCollection);
    return busesSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Bus) }));
  }

  //Agrega o actualiza un bus
  async addOrUpdateBus(busData: Bus): Promise<void> {
    const busDocRef = doc(this.firestore, 'Bus', busData.ID_Placa);
    await setDoc(busDocRef, busData, { merge: true }); // Usa merge: true para actualizar
  }

  //Elimina un bus
  async deleteBus(idPlaca: string): Promise<void> {
    const busDoc = doc(this.firestore, `Bus/${idPlaca}`);
    await deleteDoc(busDoc);
  }

  //Obtiene los conductores
  async getConductor(): Promise<Conductor[]> {
    const conductoresCollection = collection(this.firestore, 'Conductor');
    const querySnapshot = await getDocs(conductoresCollection);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Conductor) }));
  }

  //Agrega o actualiza un colegio
  async addOrUpdateColegio(colegioData: Partial<College>): Promise<void> {
    try {
      if (colegioData.id) {
        //Actualiza un colegio existente
        const colegioDocRef = doc(this.firestore, 'Colegio', colegioData.id);
        await updateDoc(colegioDocRef, colegioData);
      } else {
        //Agrega un nuevo colegio
        const newId = (await this.getNextCollegeId()).toString(); //Convierte a string inmediatamente
        const newCollege: College = {
          ...colegioData as Omit<College, 'id'>,
          id: newId
        };
        const colegioDocRef = doc(this.firestore, 'Colegio', newId);
        await setDoc(colegioDocRef, newCollege);
      }
    } catch (error) {
      throw error;
    }
  }

  //Crea un usuario de apoderado
  async createParentUser(parentData: Apoderado & { password: string }): Promise<void> {
    try {
      //Crea un usuario de autenticación
      const app = initializeApp(getApp().options, 'parentCreationApp');
      const parentAuth = getAuth(app);

      //Crea el usuario de autenticación
      const userCredential = await createUserWithEmailAndPassword(
        parentAuth, 
        parentData.Email, 
        parentData.password
      );

      //Elimina la contraseña antes de almacenar en Firestore
      const { password, ...parentDataWithoutPassword } = parentData;

      //Almacena los datos del apoderado en Firestore usando el RUT como ID del documento
      const parentDoc = doc(this.firestore, `Apoderado/${parentData.RUT}`);
      await setDoc(parentDoc, {
        ...parentDataWithoutPassword,
        uid: userCredential.user.uid  //Almacena el ID de autenticación del usuario para referencia
      });

      //Elimina la aplicación temporal
      await deleteApp(app);

    } catch (error) {
      throw error;
    }
  }

  //Obtiene los buses por colegio
  async getBusesByCollege(collegeId: string): Promise<Bus[]> {
    const busesCollection = collection(this.firestore, 'Bus');
    const q = query(busesCollection, where('FK_BUColegio', '==', collegeId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Bus) }));
  }

}








