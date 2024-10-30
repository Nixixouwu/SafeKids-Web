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
      const conductorData: Conductor = this.conductorForm.value;
      
      try {
        // Verificación de RUT duplicado
        const existingConductor = this.conductores.find(conductor => conductor.RUT === conductorData.RUT);
        
        if (existingConductor && !this.isEditing) {
          alert('Ya existe un conductor con este RUT. Por favor, use un RUT diferente.');
          return;
        }

        // Guardado o actualización del conductor
        await this.firebaseService.addOrUpdateConductor(conductorData);
        this.resetForm();
        this.loadConductores();
      } catch (error) {
        alert('Ocurrió un error al guardar el conductor. Por favor, intente nuevamente.');
      }
    }
  }

  // Método para editar un conductor existente
  editConductor(conductor: Conductor) {
    this.isEditing = true;
    this.currentConductorRut = conductor.RUT;
    this.conductorForm.patchValue(conductor);
  }

  // Método para eliminar un conductor
  deleteConductor(rut: string) {
    if (confirm('¿Estás seguro de que quieres eliminar este conductor?')) {
      this.firebaseService.deleteConductor(rut)
        .then(() => {
          this.loadConductores();
        })
        .catch(error => {
          alert('Error al eliminar el conductor. Por favor, inténtalo de nuevo.');
        });
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
  }
}
