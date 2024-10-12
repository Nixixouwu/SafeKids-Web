import { Component, OnInit, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { FirebaseService, Alumno, College, Apoderado } from '../../../services/firebase.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-student',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './student.component.html',
  styleUrls: ['./student.component.scss']
})
export class StudentComponent implements OnInit, AfterViewInit {
  alumnoForm: FormGroup;
  alumnos: Alumno[] = [];
  colleges: College[] = [];
  apoderados: Apoderado[] = [];
  apoderadoCollegeMap: Map<string, string> = new Map();
  collegeMap: Map<string, string> = new Map();

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService
  ) {
    this.alumnoForm = this.fb.group({
      Apellido: ['', Validators.required],
      Curso: ['', Validators.required],
      Direccion: ['', Validators.required],
      Edad: ['', [Validators.required, Validators.min(0), Validators.max(99), this.ageValidator]],
      FK_ALApoderado: ['', Validators.required],
      FK_ALColegio: ['', Validators.required],
      Genero: ['', Validators.required],
      Imagen: [''],
      Nombre: ['', Validators.required],
      RUT: ['', Validators.required]
    });

    // Add a listener for changes to FK_ALApoderado
    this.alumnoForm.get('FK_ALApoderado')?.valueChanges.subscribe(apoderadoRUT => {
      if (apoderadoRUT) {
        const collegeId = this.apoderadoCollegeMap.get(apoderadoRUT);
        if (collegeId) {
          this.alumnoForm.patchValue({ FK_ALColegio: collegeId });
          this.alumnoForm.get('FK_ALColegio')?.disable();
        }
      } else {
        this.alumnoForm.get('FK_ALColegio')?.enable();
      }
    });
  }

  ageValidator(control: AbstractControl): {[key: string]: any} | null {
    const value = control.value;
    if (isNaN(value) || value < 0 || value > 99) {
      return { 'invalidAge': true };
    }
    return null;
  }

  ngAfterViewInit() {
    const edadInput = document.getElementById('edad') as HTMLInputElement;
    edadInput.addEventListener('input', function(this: HTMLInputElement) {
      if (this.value.length > 2) {
        this.value = this.value.slice(0, 2);
      }
      if (parseInt(this.value) > 99) {
        this.value = '99';
      }
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
    // Create a map of college IDs to names for easy lookup
    this.collegeMap = new Map(this.colleges.map(college => [college.id, college.Nombre]));
  }

  async loadApoderados() {
    this.apoderados = await this.firebaseService.getApoderados();
    // Create a map of apoderado RUTs to college IDs
    this.apoderadoCollegeMap = new Map(this.apoderados.map(apoderado => [apoderado.RUT, apoderado.FK_APColegio]));
  }

  async onSubmit() {
    if (this.alumnoForm.valid) {
      const alumnoData = this.alumnoForm.getRawValue(); // This gets all values, including disabled fields
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
    // Check if the apoderado is set and disable the college field if necessary
    if (alumno.FK_ALApoderado) {
      this.alumnoForm.get('FK_ALColegio')?.disable();
    } else {
      this.alumnoForm.get('FK_ALColegio')?.enable();
    }
  }

  async deleteAlumno(rut: string) {
    if (confirm('¿Estás seguro de que quieres eliminar este alumno?')) {
      await this.firebaseService.deleteAlumno(rut);
      this.loadAlumnos();
    }
  }

  getCollegeName(id: string): string {
    return this.collegeMap.get(id) || 'Unknown College';
  }
}
