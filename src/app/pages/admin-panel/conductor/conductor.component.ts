import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FirebaseService, Conductor, College } from '../../../services/firebase.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { combineLatest, of } from 'rxjs';
import { AdminPanelComponent } from '../admin-panel.component';
import { switchMap } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { NumbersOnlyDirective } from '../../../validators/numbers-only.validator';
import { RutFormatterDirective } from '../../../validators/rut-formatter.validator';
import { rutValidator } from '../../../validators/rut.validator';

@Component({
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    NumbersOnlyDirective,
    RutFormatterDirective
  ],
  templateUrl: './conductor.component.html',
  styleUrls: ['./conductor.component.scss']
})
export class ConductorComponent implements OnInit {
  // Variables principales para el manejo del formulario y datos
  conductorForm: FormGroup;
  conductores: Conductor[] = [];
  colleges: College[] = [];
  collegeMap: Map<string, string> = new Map();
  currentAdminCollege: string | null = null;
  isEditing: boolean = false;
  currentConductorRut: string | null = null;
  selectedFile: File | null = null;
  imagePreview: string | null = null;

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService,
    private adminPanelComponent: AdminPanelComponent
  ) {
    // Inicialización del formulario con validaciones específicas para conductores
    this.conductorForm = this.fb.group({
      Apellido: ['', Validators.required],
      Direccion: ['', Validators.required],
      Edad: ['', [Validators.required, Validators.min(18), Validators.max(65)]], // Restricción de edad para conductores
      Genero: ['', Validators.required],
      Imagen: [''],
      Nombre: ['', Validators.required],
      RUT: ['', [Validators.required, rutValidator()]],
      Email: ['', [Validators.required, Validators.email]],
      FK_COColegio: ['', Validators.required],
      Fecha_Admision: ['', Validators.required],
    });
  }

  // Inicialización del componente y carga de datos
  ngOnInit() {
    this.loadConductores();
    this.loadColleges();
  }

  // Método para cargar la lista de conductores según permisos
  async loadConductores() {
    combineLatest([
      this.adminPanelComponent.isSuperAdmin$,
      this.adminPanelComponent.currentAdminCollege$
    ]).pipe(
      switchMap(([isSuperAdmin, collegeId]) => {
        if (isSuperAdmin) {
          return this.firebaseService.getConductor();
        } else {
          return collegeId ? this.firebaseService.getConductoresByCollege(collegeId) : of([]);
        }
      })
    ).subscribe(
      conductores => {
        this.conductores = conductores;
      },
      error => {
        this.conductores = [];
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

  // Método para manejar el envío del formulario
  async onSubmit() {
    if (this.conductorForm.valid) {
      try {
        // Usar getRawValue() para obtener también los campos deshabilitados
        const conductorData: Conductor = {
          ...this.conductorForm.getRawValue()
        };

        // Manejar la carga de imagen con limpieza de imagen anterior
        if (this.selectedFile) {
          const oldImageUrl = this.isEditing ? 
            this.conductores.find(c => c.RUT === conductorData.RUT)?.Imagen : 
            undefined;

          const imageUrl = await this.firebaseService.uploadImage(
            this.selectedFile,
            `conductores/${conductorData.RUT}`, // Organizar por RUT del conductor
            oldImageUrl  // Pasar la URL de la imagen anterior para la limpieza
          );
          conductorData.Imagen = imageUrl;
        } else if (this.isEditing) {
          // Mantener la imagen existente si no se selecciona una nueva
          const currentConductor = this.conductores.find(c => c.RUT === conductorData.RUT);
          if (currentConductor) {
            conductorData.Imagen = currentConductor.Imagen;
          }
        }

        // Verificación de RUT duplicado
        const existingConductor = this.conductores.find(conductor => 
          conductor.RUT === conductorData.RUT && !this.isEditing
        );
        
        if (existingConductor) {
          alert('Ya existe un conductor con este RUT. Por favor, use un RUT diferente.');
          return;
        }

        // Guardar datos del conductor
        await this.firebaseService.addOrUpdateConductor(conductorData);
        this.resetForm();
        this.loadConductores();
        alert('Conductor guardado exitosamente');
      } catch (error) {
        console.error('Error al guardar el conductor:', error);
        alert('Ocurrió un error al guardar el conductor. Por favor, intente nuevamente.');
      }
    }
  }

  // Método para editar un conductor existente
  editConductor(conductor: Conductor) {
    this.isEditing = true;
    this.currentConductorRut = conductor.RUT;
    
    // Resetear el formulario antes de cargar los nuevos valores
    this.conductorForm.reset();
    
    // Cargar los valores del conductor
    this.conductorForm.patchValue({
      Apellido: conductor.Apellido,
      Direccion: conductor.Direccion,
      Edad: conductor.Edad,
      Email: conductor.Email,
      FK_COColegio: conductor.FK_COColegio,
      Fecha_Admision: conductor.Fecha_Admision,
      Genero: conductor.Genero,
      Imagen: conductor.Imagen,
      Nombre: conductor.Nombre,
      RUT: conductor.RUT
    });

    // Deshabilitar RUT y Email durante la edición
    this.conductorForm.get('RUT')?.disable();
    this.conductorForm.get('Email')?.disable();
    
    // Actualizar la vista previa de la imagen si existe
    if (conductor.Imagen) {
      this.imagePreview = conductor.Imagen;
    }

    // Asegurarse de que los selectores tengan las opciones correctas
    if (conductor.FK_COColegio) {
      this.conductorForm.get('FK_COColegio')?.setValue(conductor.FK_COColegio);
    }

    if (conductor.Genero) {
      this.conductorForm.get('Genero')?.setValue(conductor.Genero);
    }

    // Asegurarse de que la fecha se establezca correctamente
    if (conductor.Fecha_Admision) {
      this.conductorForm.get('Fecha_Admision')?.setValue(conductor.Fecha_Admision);
    }
  }

  // Método para eliminar un conductor
  async deleteConductor(rut: string) {
    if (confirm('¿Estás seguro de que quieres eliminar este conductor?')) {
      try {
        const conductorToDelete = this.conductores.find(c => c.RUT === rut);
        if (conductorToDelete?.Imagen) {
          await this.firebaseService.deleteImage(conductorToDelete.Imagen);
        }
        await this.firebaseService.deleteConductor(rut);
        this.loadConductores();
      } catch (error) {
        console.error('Error al eliminar el conductor:', error);
        alert('Ocurrió un error al eliminar el conductor. Por favor, intente nuevamente.');
      }
    }
  }

  // Método auxiliar para obtener el nombre del colegio
  getCollegeName(id: string): string {
    return this.collegeMap.get(id) || 'Unknown College';
  }

  // Método para reiniciar el formulario
  resetForm() {
    this.conductorForm.reset();
    this.isEditing = false;
    this.currentConductorRut = null;
    
    // Habilitar RUT y Email
    this.conductorForm.get('RUT')?.enable();
    this.conductorForm.get('Email')?.enable();
    
    // Resetear estados de imagen
    this.selectedFile = null;
    this.imagePreview = null;
    
    // Resetear input de archivo
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // Método para manejar la selección de archivo
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
