import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FirebaseService, Apoderado, College, Alumno } from '../../../services/firebase.service';
import { CommonModule } from '@angular/common';
import { NumbersOnlyDirective } from '../../../validators/numbers-only.validator';
import { RutFormatterDirective } from '../../../validators/rut-formatter.validator';
import { rutValidator } from '../../../validators/rut.validator';
import { firstValueFrom, combineLatest, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AdminPanelComponent } from '../admin-panel.component';

@Component({
  selector: 'app-parent',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NumbersOnlyDirective, RutFormatterDirective],
  templateUrl: './parent.component.html',
  styleUrls: ['./parent.component.scss']
})
export class ParentComponent implements OnInit {
  // Variables principales para el manejo del formulario y datos
  apoderadoForm: FormGroup;
  apoderados: Apoderado[] = [];
  colleges: College[] = [];
  collegeMap: Map<string, string> = new Map();
  currentAdminCollege: string | null = null;
  isEditing: boolean = false;
  currentParentRut: string | null = null;
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  alumnos: Alumno[] = [];

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService,
    private adminPanelComponent: AdminPanelComponent
  ) {
    // Inicialización del formulario con validaciones
    this.apoderadoForm = this.fb.group({
      // Datos personales
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
      Email: ['', [
        Validators.required,
        Validators.email,
        Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
      ]],
      Telefono: ['', [
        Validators.required,
        Validators.pattern(/^\+?[0-9]{8,15}$/) // Acepta números entre 8 y 15 dígitos, con o sin '+'
      ]],
      FK_APColegio: ['', 
        Validators.required
      ],
      FK_APAlumno: ['', Validators.required],
      password: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/)
      ]],
      Imagen: [''],
    });
  }

  // Inicialización del componente y carga de datos
  ngOnInit() {
    this.loadApoderados();
    this.loadColleges();
    this.loadAlumnos();
  }

  // Método para cargar los datos del administrador actual
  async loadCurrentAdminData() {
    try {
      const currentUser = await firstValueFrom(this.firebaseService.getCurrentUser());
      if (currentUser) {
        const adminData = await this.firebaseService.getAdminData(currentUser);
        if (adminData) {
          this.currentAdminCollege = adminData.fk_adcolegio;
        }
      }
    } catch (error) {
    }
  }

  // Método para cargar la lista de apoderados según permisos
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
      },
      error => {
        this.apoderados = [];
      }
    );
  }

  // Método para cargar la lista de colegios según permisos
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

  // Método auxiliar para obtener el nombre del colegio
  getCollegeName(id: string): string {
    return this.collegeMap.get(id) || 'Unknown College';
  }

  // Método para cargar la lista de alumnos
  async loadAlumnos() {
    try {
      const isSuperAdmin = await firstValueFrom(this.adminPanelComponent.isSuperAdmin$);
      const collegeId = await firstValueFrom(this.adminPanelComponent.currentAdminCollege$);

      if (isSuperAdmin) {
        this.alumnos = await this.firebaseService.getAlumnosByCollege(null);
      } else if (collegeId) {
        this.alumnos = await this.firebaseService.getAlumnosByCollege(collegeId);
      }
    } catch (error) {
      console.error('Error loading alumnos:', error);
      this.alumnos = [];
    }
  }

  // Método para manejar el envío del formulario
  async onSubmit() {
    if (this.apoderadoForm.valid) {
      try {
        const apoderadoData = this.apoderadoForm.getRawValue();
        
        // Si hay una imagen seleccionada, súbela primero
        if (this.selectedFile) {
          const imageUrl = await this.firebaseService.uploadImage(
            this.selectedFile,
            'apoderados',
            this.isEditing ? apoderadoData.Imagen : undefined
          );
          apoderadoData.Imagen = imageUrl;
        }

        if (this.isEditing) {
          // Si está editando, no enviar la contraseña
          const { password, ...dataToUpdate } = apoderadoData;
          await this.firebaseService.addOrUpdateApoderado(dataToUpdate);
        } else {
          // Si es nuevo, crear usuario con contraseña
          await this.firebaseService.createParentUser(apoderadoData);
        }

        await this.loadApoderados();
        this.resetForm();
        alert('Apoderado guardado exitosamente');
      } catch (error) {
        console.error('Error al guardar el apoderado:', error);
        alert('Ocurrió un error al guardar el apoderado. Por favor, intente nuevamente.');
      }
    }
  }

  // Método para editar un apoderado existente
  editApoderado(apoderado: Apoderado) {
    this.isEditing = true;
    this.currentParentRut = apoderado.RUT;
    
    // Primero resetear el formulario
    this.apoderadoForm.reset();
    
    // Luego cargar los valores del apoderado
    this.apoderadoForm.patchValue({
      Apellido: apoderado.Apellido,
      Nombre: apoderado.Nombre,
      RUT: apoderado.RUT,
      Email: apoderado.Email,
      Telefono: apoderado.Telefono,
      FK_APColegio: apoderado.FK_APColegio,
      Imagen: apoderado.Imagen
    });

    // Deshabilitar RUT y Email durante la edición
    this.apoderadoForm.get('RUT')?.disable();
    this.apoderadoForm.get('Email')?.disable();
    
    // Eliminar validación de contraseña en modo edición
    this.apoderadoForm.get('password')?.clearValidators();
    this.apoderadoForm.get('password')?.updateValueAndValidity();
    
    // Actualizar la vista previa de la imagen si existe
    if (apoderado.Imagen) {
      this.imagePreview = apoderado.Imagen;
    }

    // Asegurarse de que el selector de colegio tenga la opción correcta
    if (apoderado.FK_APColegio) {
      this.apoderadoForm.get('FK_APColegio')?.setValue(apoderado.FK_APColegio);
    }
  }

  // Método para reiniciar el formulario
  resetForm() {
    this.apoderadoForm.reset();
    this.isEditing = false;
    this.currentParentRut = null;
    
    // Habilita campos y restaura validaciones
    this.apoderadoForm.get('RUT')?.enable();
    this.apoderadoForm.get('Email')?.enable();
    
    this.apoderadoForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.apoderadoForm.get('password')?.updateValueAndValidity();
    
    // Resetear estados de imagen
    this.selectedFile = null;
    this.imagePreview = null;
    
    // Resetear input de archivo
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // Método para eliminar un apoderado
  async deleteApoderado(rut: string) {
    if (confirm('¿Estás seguro de que quieres eliminar este apoderado?')) {
      try {
        const apoderadoToDelete = this.apoderados.find(a => a.RUT === rut);
        if (apoderadoToDelete?.Imagen) {
          await this.firebaseService.deleteImage(apoderadoToDelete.Imagen);
        }
        await this.firebaseService.deleteApoderado(rut);
        this.loadApoderados();
      } catch (error) {
        console.error('Error al eliminar el apoderado:', error);
        alert('Ocurrió un error al eliminar el apoderado. Por favor, intente nuevamente.');
      }
    }
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
}
