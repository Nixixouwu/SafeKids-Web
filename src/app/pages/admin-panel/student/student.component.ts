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
  // Variables principales para el manejo del formulario y datos
  alumnoForm: FormGroup;
  alumnos: Alumno[] = [];
  colleges: College[] = [];
  apoderados: Apoderado[] = [];
  apoderadoCollegeMap: Map<string, string> = new Map();
  collegeMap: Map<string, string> = new Map();
  currentAdminCollege: string | null = null;
  isEditing: boolean = false;
  currentStudentRut: string | null = null;
  selectedFile: File | null = null;
  imagePreview: string | null = null;

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService,
    private adminPanelComponent: AdminPanelComponent
  ) {
    // Inicialización del formulario con validaciones
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

    // Observador para cambios en el apoderado seleccionado
    this.alumnoForm.get('FK_ALApoderado')?.valueChanges.subscribe(apoderadoRUT => {
      if (apoderadoRUT) {
        // Actualiza automáticamente el colegio según el apoderado seleccionado
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

  // Validador personalizado para el campo de edad
  ageValidator(control: AbstractControl): {[key: string]: any} | null {
    const value = control.value;
    if (isNaN(value) || value < 0 || value > 99) {
      return { 'invalidAge': true };
    }
    return null;
  }

  // Configuración del límite de edad después de que la vista se inicializa
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

  // Inicialización del componente y carga de datos
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
    });

    // Carga de datos complementarios
    this.loadColleges();
    this.loadApoderados();
  }

  // Método para cargar la lista de alumnos
  async loadAlumnos() {
    this.adminPanelComponent.currentAdminCollege$.pipe(
      switchMap(collegeId => {
        return collegeId ? this.firebaseService.getAlumnosByCollege(collegeId) : of([]);
      })
    ).subscribe(
      alumnos => {
        this.alumnos = alumnos;
      },
      error => {
        this.alumnos = [];
      }
    );
  }

  // Método para cargar la lista de colegios
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
      },
      error => {
        this.colleges = [];
      }
    );
  }

  // Método para cargar la lista de apoderados
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
      },
      error => {
        this.apoderados = [];
      }
    );
  }

  // Método para manejar el envío del formulario
  async onSubmit() {
    if (this.alumnoForm.valid) {
      try {
        const alumnoData = this.alumnoForm.getRawValue();
        
        // Handle image upload with old image cleanup
        if (this.selectedFile) {
          const oldImageUrl = this.isEditing ? 
            this.alumnos.find(a => a.RUT === alumnoData.RUT)?.Imagen : 
            undefined;

          const imageUrl = await this.firebaseService.uploadImage(
            this.selectedFile,
            `alumnos/${alumnoData.RUT}`, // Organize by student RUT
            oldImageUrl
          );
          alumnoData.Imagen = imageUrl;
        } else if (this.isEditing) {
          // Keep existing image if no new one is selected
          const currentStudent = this.alumnos.find(a => a.RUT === alumnoData.RUT);
          if (currentStudent) {
            alumnoData.Imagen = currentStudent.Imagen;
          }
        }

        // Verificación de RUT duplicado
        const existingStudent = this.alumnos.find(student => 
          student.RUT === alumnoData.RUT && !this.isEditing
        );
        
        if (existingStudent) {
          alert('Ya existe un alumno con este RUT. Por favor, use un RUT diferente.');
          return;
        }

        await this.firebaseService.addOrUpdateAlumno(alumnoData);
        this.resetForm();
        this.loadAlumnos();
        alert('Alumno guardado exitosamente');
      } catch (error) {
        console.error('Error al guardar el alumno:', error);
        alert('Ocurrió un error al guardar el alumno. Por favor, intente nuevamente.');
      }
    }
  }

  // Método para editar un alumno existente
  editAlumno(alumno: Alumno) {
    this.isEditing = true;
    this.currentStudentRut = alumno.RUT;
    
    // Resetear el formulario antes de cargar los nuevos valores
    this.alumnoForm.reset();
    
    // Cargar los valores del alumno
    this.alumnoForm.patchValue({
      Apellido: alumno.Apellido,
      Curso: alumno.Curso,
      Direccion: alumno.Direccion,
      Edad: alumno.Edad,
      FK_ALApoderado: alumno.FK_ALApoderado,
      FK_ALColegio: alumno.FK_ALColegio,
      Genero: alumno.Genero,
      Imagen: alumno.Imagen,
      Nombre: alumno.Nombre,
      RUT: alumno.RUT
    });

    // Deshabilitar RUT durante la edición
    this.alumnoForm.get('RUT')?.disable();
    
    // Actualizar la vista previa de la imagen si existe
    if (alumno.Imagen) {
      this.imagePreview = alumno.Imagen;
    }
  }

  // Método para reiniciar el formulario
  resetForm() {
    this.alumnoForm.reset();
    this.isEditing = false;
    this.currentStudentRut = null;
    this.alumnoForm.get('RUT')?.enable();
    
    // Reset image-related states
    this.selectedFile = null;
    this.imagePreview = null;
    
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // Método para eliminar un alumno
  async deleteAlumno(rut: string) {
    if (confirm('¿Estás seguro de que quieres eliminar este alumno?')) {
      try {
        const alumnoToDelete = this.alumnos.find(a => a.RUT === rut);
        if (alumnoToDelete?.Imagen) {
          await this.firebaseService.deleteImage(alumnoToDelete.Imagen);
        }
        await this.firebaseService.deleteAlumno(rut);
        this.loadAlumnos();
      } catch (error) {
        console.error('Error al eliminar el alumno:', error);
        alert('Ocurrió un error al eliminar el alumno. Por favor, intente nuevamente.');
      }
    }
  }

  // Método auxiliar para obtener el nombre del colegio
  getCollegeName(id: string): string {
    return this.collegeMap.get(id) || 'Unknown College';
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }
}
