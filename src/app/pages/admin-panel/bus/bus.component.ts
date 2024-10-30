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

  // Método para manejar el envío del formulario
  async onSubmit() {
    if (this.busForm.valid) {
      const busData: Bus = this.busForm.value;
      
      try {
        // Verificación de placa duplicada
        const existingBus = this.buses.find(bus => bus.ID_Placa === busData.ID_Placa);
        
        if (existingBus && !this.isEditing) {
          alert('Ya existe un bus con esta placa. Por favor, use una placa diferente.');
          return;
        }

        // Guardado o actualización del bus
        await this.firebaseService.addOrUpdateBus(busData);
        this.resetForm();
        this.loadBuses();
      } catch (error) {
        alert('Ocurrió un error al guardar el bus. Por favor, intente nuevamente.');
      }
    }
  }

  // Método para editar un bus existente
  editBus(bus: Bus) {
    this.isEditing = true;
    this.currentBusId = bus.ID_Placa;
    this.busForm.patchValue(bus);
    this.busForm.get('ID_Placa')?.disable();
  }

  // Método para reiniciar el formulario
  resetForm() {
    this.busForm.reset();
    this.isEditing = false;
    this.currentBusId = null;
    this.busForm.get('ID_Placa')?.enable();
  }

  // Método para eliminar un bus
  async deleteBus(idPlaca: string) {
    if (confirm('¿Estás seguro de que quieres eliminar este bus?')) {
      await this.firebaseService.deleteBus(idPlaca);
      this.loadBuses();
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
