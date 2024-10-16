import { Component, OnInit, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { FirebaseService, Alumno, College, Apoderado, AdminData } from '../../../services/firebase.service';
import { CommonModule } from '@angular/common';
import { firstValueFrom, combineLatest, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AdminPanelComponent } from '../admin-panel.component';
import { NumbersOnlyDirective } from '../../../validators/numbers-only.validator';
import { RutFormatterDirective } from '../../../validators/rut-formatter.validator';
import { rutValidator } from '../../../validators/rut.validator';

@Component({
  selector: 'app-student',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NumbersOnlyDirective, RutFormatterDirective],
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
  currentAdminCollege: string | null = null;

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService,
    private adminPanelComponent: AdminPanelComponent
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
      RUT: ['', [Validators.required, rutValidator()]]
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
    combineLatest([
      this.adminPanelComponent.isSuperAdmin$,
      this.adminPanelComponent.currentAdminCollege$
    ]).pipe(
      switchMap(([isSuperAdmin, collegeId]) => {
        if (isSuperAdmin) {
          return this.firebaseService.getAlumnosByCollege(null);
        } else {
          return collegeId ? this.firebaseService.getAlumnosByCollege(collegeId) : of([]);
        }
      })
    ).subscribe(alumnos => {
      this.alumnos = alumnos;
      console.log('Loaded alumnos:', this.alumnos);
    });

    // Load other necessary data
    this.loadColleges();
    this.loadApoderados();
  }

  async loadAlumnos() {
    this.adminPanelComponent.currentAdminCollege$.pipe(
      switchMap(collegeId => {
        console.log('Loading alumnos for college:', collegeId);
        return collegeId ? this.firebaseService.getAlumnosByCollege(collegeId) : of([]);
      })
    ).subscribe(
      alumnos => {
        this.alumnos = alumnos;
        console.log('Loaded alumnos:', this.alumnos);
      },
      error => {
        console.error('Error loading alumnos:', error);
        this.alumnos = [];
      }
    );
  }

  async loadColleges() {
    combineLatest([
      this.adminPanelComponent.isSuperAdmin$,
      this.adminPanelComponent.currentAdminCollege$
    ]).pipe(
      switchMap(([isSuperAdmin, collegeId]) => {
        if (isSuperAdmin) {
          return this.firebaseService.getColleges();
        } else {
          return collegeId ? this.firebaseService.getCollege(collegeId).then(college => college ? [college] : []) : of([]);
        }
      })
    ).subscribe(
      colleges => {
        this.colleges = colleges;
        this.collegeMap = new Map(this.colleges.map(college => [college.id, college.Nombre]));
        console.log('Loaded colleges:', this.colleges);
      },
      error => {
        console.error('Error loading colleges:', error);
        this.colleges = [];
      }
    );
  }

  async loadApoderados() {
    combineLatest([
      this.adminPanelComponent.isSuperAdmin$,
      this.adminPanelComponent.currentAdminCollege$
    ]).pipe(
      switchMap(([isSuperAdmin, collegeId]) => {
        if (isSuperAdmin) {
          return this.firebaseService.getApoderados();
        } else {
          return collegeId ? this.firebaseService.getApoderadosByCollege(collegeId) : of([]);
        }
      })
    ).subscribe(
      apoderados => {
        this.apoderados = apoderados;
        this.apoderadoCollegeMap = new Map(this.apoderados.map(apoderado => [apoderado.RUT, apoderado.FK_APColegio]));
        console.log('Loaded apoderados:', this.apoderados);
      },
      error => {
        console.error('Error loading apoderados:', error);
        this.apoderados = [];
      }
    );
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
