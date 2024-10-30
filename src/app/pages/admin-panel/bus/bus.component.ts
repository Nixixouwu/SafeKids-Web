import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FirebaseService, Bus, College, Conductor } from '../../../services/firebase.service';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { combineLatest, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AdminPanelComponent } from '../admin-panel.component';

@Component({
  selector: 'app-bus',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './bus.component.html',
  styleUrls: ['./bus.component.scss']
})
export class BusComponent implements OnInit {
  // Variables principales para el manejo del formulario y datos
  busForm: FormGroup;
  buses: Bus[] = [];
  colleges: College[] = [];
  conductores: Conductor[] = [];
  collegeMap: Map<string, string> = new Map();
  conductorMap: Map<string, string> = new Map();
  isEditing: boolean = false;
  currentBusId: string | null = null;

  // Agregar variables para manejo de imágenes
  selectedFile: File | null = null;
  imagePreview: string | null = null;

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService,
    private adminPanelComponent: AdminPanelComponent
  ) {
    // Inicialización del formulario con validaciones para buses
    this.busForm = this.fb.group({
      FK_BUColegio: ['', Validators.required],
      FK_BUConductor: ['', Validators.required],
      ID_Placa: ['', Validators.required],
      Imagen: [''],
      Modelo: ['', Validators.required],
    });
  }

  // Inicialización del componente y carga de datos
  ngOnInit() {
    this.loadBuses();
    this.loadColleges();
    this.loadConductores();
  }

  // Método para cargar la lista de buses según permisos
  async loadBuses() {
    combineLatest([
      this.adminPanelComponent.isSuperAdmin$,
      this.adminPanelComponent.currentAdminCollege$
    ]).pipe(
      switchMap(([isSuperAdmin, collegeId]) => {
        if (isSuperAdmin) {
          return this.firebaseService.getBuses();
        } else {
          return collegeId ? this.firebaseService.getBusesByCollege(collegeId) : of([]);
        }
      })
    ).subscribe(
      buses => {
        this.buses = buses;
      },
      error => {
        this.buses = [];
      }
    );
  }

  // Método para manejar la selección de archivo
  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      
      // Crear preview de la imagen
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  // Método para manejar el envío del formulario
  async onSubmit() {
    if (this.busForm.valid) {
      try {
        const busData: Bus = {
          ...this.busForm.getRawValue(),
        };

        // Manejar la carga de imagen con limpieza de imagen anterior
        if (this.selectedFile) {
          const oldImageUrl = this.isEditing ? 
            this.buses.find(b => b.ID_Placa === busData.ID_Placa)?.Imagen : 
            undefined;

          const imageUrl = await this.firebaseService.uploadImage(
            this.selectedFile,
            `buses/${busData.ID_Placa}`, // Organizar por ID del bus
            oldImageUrl
          );
          busData.Imagen = imageUrl;
        } else if (this.isEditing) {
          // Mantener la imagen existente si no se selecciona una nueva
          const currentBus = this.buses.find(bus => bus.ID_Placa === busData.ID_Placa);
          if (currentBus) {
            busData.Imagen = currentBus.Imagen;
          }
        }

        // Guardar datos del bus
        await this.firebaseService.addOrUpdateBus(busData);
        this.resetForm();
        this.loadBuses();
        alert('Bus guardado exitosamente');
      } catch (error) {
        console.error('Error al guardar el bus:', error);
        alert('Ocurrió un error al guardar el bus. Por favor, intente nuevamente.');
      }
    }
  }

  // Método para editar un bus existente
  editBus(bus: Bus) {
    this.isEditing = true;
    this.currentBusId = bus.ID_Placa;
    
    // Primero cargar los colegios y conductores si es necesario
    Promise.all([
      this.loadColleges(),
      this.loadConductores()
    ]).then(() => {
      // Resetear el formulario antes de cargar los nuevos valores
      this.busForm.reset();
      
      // Cargar los valores del bus
      this.busForm.patchValue({
        FK_BUColegio: bus.FK_BUColegio,
        FK_BUConductor: bus.FK_BUConductor,
        ID_Placa: bus.ID_Placa,
        Imagen: bus.Imagen,
        Modelo: bus.Modelo
      });

      // Deshabilitar el campo ID_Placa durante la edición
      this.busForm.get('ID_Placa')?.disable();
      
      // Actualizar la vista previa de la imagen si existe
      if (bus.Imagen) {
        this.imagePreview = bus.Imagen;
      }

      // Asegurarse de que los selectores tengan las opciones correctas
      if (bus.FK_BUColegio) {
        const college = this.colleges.find(c => c.id === bus.FK_BUColegio);
        if (college) {
          this.busForm.get('FK_BUColegio')?.setValue(college.id);
        }
      }

      if (bus.FK_BUConductor) {
        const conductor = this.conductores.find(c => c.RUT === bus.FK_BUConductor);
        if (conductor) {
          this.busForm.get('FK_BUConductor')?.setValue(conductor.RUT);
        }
      }
    });
  }

  // Método para reiniciar el formulario
  resetForm() {
    this.busForm.reset();
    this.isEditing = false;
    this.currentBusId = null;
    this.busForm.get('ID_Placa')?.enable();
    
    // Reinicio de variables de imagen
    this.selectedFile = null;
    this.imagePreview = null;
    
    // También reiniciar el elemento de entrada de archivo
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // Método para eliminar un bus
  async deleteBus(idPlaca: string) {
    if (confirm('¿Estás seguro de que quieres eliminar este bus?')) {
      try {
        // Obtener los datos del bus para acceder a la URL de la imagen
        const busToDelete = this.buses.find(bus => bus.ID_Placa === idPlaca);
        if (busToDelete?.Imagen) {
          // Eliminar la imagen primero
          await this.firebaseService.deleteImage(busToDelete.Imagen);
        }
        // Luego eliminar el documento del bus
        await this.firebaseService.deleteBus(idPlaca);
        this.loadBuses();
      } catch (error) {
        console.error('Error al eliminar el bus:', error);
        alert('Ocurrió un error al eliminar el bus. Por favor, intente nuevamente.');
      }
    }
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

  // Método para cargar la lista de conductores según permisos
  loadConductores() {
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
        this.conductorMap = new Map(
          this.conductores.map(conductor => [
            conductor.RUT,
            `${conductor.Nombre} ${conductor.Apellido} (${conductor.RUT})`
          ])
        );
      },
      error => {
        this.conductores = [];
      }
    );
  }

  // Método auxiliar para obtener el nombre del conductor
  getConductorName(rut: string): string {
    return this.conductorMap.get(rut) || 'Unknown Conductor';
  }
}
