import { Component, OnInit, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidatorFn, ValidationErrors } from '@angular/forms';
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
      Nombre: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
      ]],
      Apellido: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
      ]],
      RUT: ['', [
        Validators.required,
        rutValidator()
      ]],
      Edad: ['', [
        Validators.required,
        Validators.min(4),
        Validators.max(20),
        Validators.pattern(/^[0-9]+$/)
      ]],
      Curso: ['', [
        Validators.required,
        this.cursoValidator()
      ]],
      Direccion: ['', [
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(100)
      ]],
      FK_ALColegio: ['', Validators.required],
      Genero: ['', Validators.required],
      Imagen: ['']
    });

    // Observador para cambios en el apoderado seleccionado
    this.alumnoForm.get('FK_ALColegio')?.valueChanges.subscribe(collegeId => {
      if (collegeId) {
        // Actualiza automáticamente el colegio según el apoderado seleccionado
        this.alumnoForm.patchValue({ FK_ALColegio: collegeId });
        this.alumnoForm.get('FK_ALColegio')?.disable();
      }
    });
  }

  // Validador personalizado para el formato del curso
  private cursoValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      // Convertir a mayúsculas automáticamente
      let curso = control.value.toUpperCase();
      
      // Si el valor cambió, actualizarlo en el control
      if (curso !== control.value) {
        setTimeout(() => {
          control.setValue(curso, { emitEvent: false });
        });
      }

      // Patrón para cursos básicos: 1A, 1B, 2A, 2B, ..., 8A, 8B
      const basicPattern = /^[1-8][A-B]$/;
      
      // Patrón para cursos medios: 1MA, 1MB, 2MA, 2MB, ..., 4MA, 4MB
      const medioPattern = /^[1-4]M[A-B]$/;

      if (!basicPattern.test(curso) && !medioPattern.test(curso)) {
        return { formatoInvalido: true };
      }

      return null;
    };
  }

  // Configuración del límite de edad después de que la vista se inicializa
  ngAfterViewInit() {
    const edadInput = document.getElementById('edad') as HTMLInputElement;
    edadInput.addEventListener('input', function(this: HTMLInputElement) {
      // Limitar a 2 dígitos y máximo 20
      if (this.value.length > 2) {
        this.value = this.value.slice(0, 2);
      }
      if (parseInt(this.value) > 20) {
        this.value = '20';
      }
    });
  }

  // Inicialización del componente y carga de datos
  ngOnInit() {
    // Inicializar el formulario
    this.initForm();

    // Cargar datos
    this.loadColleges();
    this.loadAlumnos();
  }

  // Método para cargar la lista de alumnos
  async loadAlumnos() {
    try {
      // Obtener el estado actual del admin
      const isSuperAdmin = await firstValueFrom(this.adminPanelComponent.isSuperAdmin$);
      const collegeId = await firstValueFrom(this.adminPanelComponent.currentAdminCollege$);

      // Cargar alumnos según el tipo de admin
      if (isSuperAdmin) {
        this.alumnos = await this.firebaseService.getAlumnosByCollege(null);
      } else if (collegeId) {
        this.alumnos = await this.firebaseService.getAlumnosByCollege(collegeId);
      } else {
        this.alumnos = [];
      }
    } catch (error) {
      console.error('Error loading alumnos:', error);
      this.alumnos = [];
    }
  }

  // Método para cargar los colegios
  async loadColleges() {
    try {
      // Obtener el estado actual del admin
      const isSuperAdmin = await firstValueFrom(this.adminPanelComponent.isSuperAdmin$);
      const currentCollege = await firstValueFrom(this.adminPanelComponent.currentAdminCollege$);

      if (isSuperAdmin) {
        // Si es super admin, cargar todos los colegios
        this.colleges = await this.firebaseService.getColleges();
      } else if (currentCollege) {
        // Si es admin normal, cargar solo su colegio
        const college = await this.firebaseService.getCollege(currentCollege);
        this.colleges = college ? [college] : [];
        
        // Establecer automáticamente el colegio y deshabilitar el campo
        this.alumnoForm.patchValue({ FK_ALColegio: currentCollege });
        this.alumnoForm.get('FK_ALColegio')?.disable();
      }

      // Actualizar el mapa de colegios
      this.collegeMap = new Map(
        this.colleges.map(college => [college.id, college.Nombre])
      );
    } catch (error) {
      console.error('Error loading colleges:', error);
      this.colleges = [];
    }
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

        // Guardar alumno
        await this.firebaseService.addOrUpdateAlumno(alumnoData);
        
        // Recargar la lista de alumnos DESPUÉS de guardar
        await this.loadAlumnos();
        
        // Resetear el formulario DESPUÉS de recargar los datos
        this.resetForm();
        
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
    
    // Resetear estados de imagen
    this.selectedFile = null;
    this.imagePreview = null;
    
    // Resetear input de archivo
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
      
      // Crear vista previa
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  // Método para inicializar el formulario
  private initForm() {
    this.alumnoForm = this.fb.group({
      Nombre: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
      ]],
      Apellido: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
      ]],
      RUT: ['', [
        Validators.required,
        rutValidator()
      ]],
      Curso: ['', [
        Validators.required,
        this.cursoValidator()
      ]],
      Direccion: ['', [
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(100)
      ]],
      Edad: ['', [
        Validators.required,
        Validators.min(4),
        Validators.max(20)
      ]],
      FK_ALColegio: ['', Validators.required],
      Genero: ['', Validators.required],
      Imagen: ['']
    });
  }
}
