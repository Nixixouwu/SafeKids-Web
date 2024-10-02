import { Injectable } from '@angular/core';
import { Auth, User, user, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc, collection, getDocs, addDoc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

interface AdminData {
  Apellido: string;
  Email: string;
  FK_ADColegio: string;
  Nombre: string;
  RUT: string;
  Rol: string;
  Telefono: string;
}

export interface College {
  id: string;
  Direccion: string;
  Email: string;
  Encargado: string;
  ID: number;
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
  Apellido: string;
  Email: string;
  FK_APColegio: string;
  Imagen: string;
  Nombre: string;
  RUT: string;
  Telefono: string;
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  constructor(
    private auth: Auth,
    private firestore: Firestore
  ) {}

  signIn(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  signOut() {
    return signOut(this.auth);
  }

  getCurrentUser(): Observable<User | null> {
    return user(this.auth);
  }

  async isUserAdmin(uid: string): Promise<boolean> {
    const adminDocRef = doc(this.firestore, `Admin/${uid}`);
    const adminDoc = await getDoc(adminDocRef);
    if (adminDoc.exists()) {
      const data = adminDoc.data() as AdminData;
      return data.Rol === 'Admin';
    }
    return false;
  }

  async getAdminData(uid: string): Promise<AdminData | null> {
    try {
      const adminDocRef = doc(this.firestore, `Admin/${uid}`);
      const adminDoc = await getDoc(adminDocRef);
      if (adminDoc.exists()) {
        return adminDoc.data() as AdminData;
      }
      return null;
    } catch (error) {
      console.error('Error fetching admin data:', error);
      return null;
    }
  }

  async registerAdmin(email: string, password: string, adminData: Omit<AdminData, 'Email'>): Promise<void> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      
      await setDoc(doc(this.firestore, `Admin/${user.uid}`), {
        ...adminData,
        Email: email,
        Rol: 'Admin'
      });
    } catch (error) {
      console.error('Error registering admin:', error);
      throw error;
    }
  }

  async getColleges(): Promise<College[]> {
    const collegesCollection = collection(this.firestore, 'Colegio');
    const collegesSnapshot = await getDocs(collegesCollection);
    return collegesSnapshot.docs.map(doc => ({
      id: doc.id,
      Direccion: doc.data()['Direccion'],
      Email: doc.data()['Email'],
      Encargado: doc.data()['Encargado'],
      ID: doc.data()['ID'],
      Nombre: doc.data()['Nombre'],
      Telefono: doc.data()['Telefono']
    }));
  }

  async addCollege(collegeData: Omit<College, 'id'>): Promise<string> {
    try {
      const collegesCollection = collection(this.firestore, 'Colegio');
      const docRef = await addDoc(collegesCollection, collegeData);
      console.log('Document written with ID: ', docRef.id);
      return docRef.id;
    } catch (e) {
      console.error('Error adding document: ', e);
      throw e;
    }
  }

  async updateCollege(collegeData: College): Promise<void> {
    const { id, ...updateData } = collegeData;
    const collegeDoc = doc(this.firestore, `Colegio/${id}`);
    await updateDoc(collegeDoc, updateData);
  }

  async deleteCollege(id: string): Promise<void> {
    const collegeDoc = doc(this.firestore, `Colegio/${id}`);
    await deleteDoc(collegeDoc);
  }

  async getAlumnos(): Promise<Alumno[]> {
    const alumnosCollection = collection(this.firestore, 'Alumnos');
    const alumnosSnapshot = await getDocs(alumnosCollection);
    return alumnosSnapshot.docs.map(doc => doc.data() as Alumno);
  }

  async addOrUpdateAlumno(alumnoData: Alumno): Promise<void> {
    const alumnoDoc = doc(this.firestore, 'Alumnos', alumnoData.RUT);
    await setDoc(alumnoDoc, alumnoData, { merge: true });
  }

  async deleteAlumno(rut: string): Promise<void> {
    const alumnoDoc = doc(this.firestore, 'Alumnos', rut);
    await deleteDoc(alumnoDoc);
  }

  async getApoderados(): Promise<Apoderado[]> {
    const apoderadosCollection = collection(this.firestore, 'Apoderado');
    const apoderadosSnapshot = await getDocs(apoderadosCollection);
    return apoderadosSnapshot.docs.map(doc => doc.data() as Apoderado);
  }

  async addOrUpdateApoderado(apoderadoData: Apoderado): Promise<void> {
    const apoderadoDoc = doc(this.firestore, 'Apoderado', apoderadoData.RUT);
    await setDoc(apoderadoDoc, apoderadoData, { merge: true });
  }

  async deleteApoderado(rut: string): Promise<void> {
    const apoderadoDoc = doc(this.firestore, 'Apoderado', rut);
    await deleteDoc(apoderadoDoc);
  }
}