import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FirebaseService, Alumno, College, Apoderado } from '../../../services/firebase.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-student',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './student.component.html',
  styleUrls: ['./student.component.scss']
})
export class StudentComponent implements OnInit {
  alumnoForm: FormGroup;
  alumnos: Alumno[] = [];
  colleges: College[] = [];
  apoderados: Apoderado[] = [];  // Add this line

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService
  ) {
    this.alumnoForm = this.fb.group({
      Apellido: ['', Validators.required],
      Curso: ['', Validators.required],
      Direccion: ['', Validators.required],
      Edad: ['', [Validators.required, Validators.min(0), Validators.max(99)]],
      FK_ALApoderado: ['', Validators.required],
      FK_ALColegio: ['', Validators.required],
      Genero: ['', Validators.required],
      Imagen: [''],
      Nombre: ['', Validators.required],
      RUT: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadAlumnos();
    this.loadColleges();
    this.loadApoderados();  // Add this line
  }

  async loadAlumnos() {
    this.alumnos = await this.firebaseService.getAlumnos();
  }

  async loadColleges() {
    this.colleges = await this.firebaseService.getColleges();
  }

  async loadApoderados() {  // Add this method
    this.apoderados = await this.firebaseService.getApoderados();
  }

  async onSubmit() {
    if (this.alumnoForm.valid) {
      const alumnoData = this.alumnoForm.value;
      try {
        await this.firebaseService.addOrUpdateAlumno(alumnoData);
        console.log('Alumno saved successfully');
        this.alumnoForm.reset();
        this.loadAlumnos();
      } catch (error) {
        console.error('Error submitting alumno:', error);
      }
    } else {
      console.log('Form is invalid', this.alumnoForm.errors);
    }
  }

  editAlumno(alumno: Alumno) {
    this.alumnoForm.patchValue(alumno);
  }

  async deleteAlumno(rut: string) {
    if (confirm('¿Estás seguro de que quieres eliminar este alumno?')) {
      await this.firebaseService.deleteAlumno(rut);
      this.loadAlumnos();
    }
  }
}