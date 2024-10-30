import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FirebaseService, Bus, College, Conductor } from '../../../services/firebase.service';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bus',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './bus.component.html',
  styleUrls: ['./bus.component.scss']
})
export class BusComponent implements OnInit {
  busForm: FormGroup;
  buses: Bus[] = [];
  colleges: College[] = [];
  conductores: Conductor[] = [];
  collegeMap: Map<string, string> = new Map();
  conductorMap: Map<string, string> = new Map();
  isEditing: boolean = false;
  currentBusId: string | null = null;

  constructor(private fb: FormBuilder, private firebaseService: FirebaseService) {
    this.busForm = this.fb.group({
      FK_BUColegio: ['', Validators.required],
      FK_BUConductor: ['', Validators.required],
      ID_Placa: ['', Validators.required],
      Imagen: [''],
      Modelo: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.loadBuses();
    this.loadColleges();
    this.loadConductores();
  }

  async loadBuses() {
    this.buses = await this.firebaseService.getBuses();
  }

  async onSubmit() {
    if (this.busForm.valid) {
      const busData: Bus = this.busForm.value;
      
      try {
        const existingBus = this.buses.find(bus => bus.ID_Placa === busData.ID_Placa);
        
        if (existingBus && !this.isEditing) {
          alert('Ya existe un bus con esta placa. Por favor, use una placa diferente.');
          return;
        }

        await this.firebaseService.addOrUpdateBus(busData);
        console.log('Bus guardado exitosamente');
        this.busForm.reset();
        this.isEditing = false;
        this.currentBusId = null;
        this.loadBuses();
      } catch (error) {
        console.error('Error al guardar el bus:', error);
        alert('Ocurrió un error al guardar el bus. Por favor, intente nuevamente.');
      }
    } else {
      console.log('El formulario es inválido', this.busForm.errors);
    }
  }

  editBus(bus: Bus) {
    this.isEditing = true;
    this.currentBusId = bus.ID_Placa;
    this.busForm.patchValue(bus);
    this.busForm.get('ID_Placa')?.disable();
  }

  resetForm() {
    this.busForm.reset();
    this.isEditing = false;
    this.currentBusId = null;
    this.busForm.get('ID_Placa')?.enable();
  }

  async deleteBus(idPlaca: string) {
    if (confirm('¿Estás seguro de que quieres eliminar este bus?')) {
      await this.firebaseService.deleteBus(idPlaca);
      this.loadBuses();
    }
  }

  async loadColleges() {
    try {
      this.colleges = await this.firebaseService.getColleges();
      this.collegeMap = new Map(this.colleges.map(college => [college.id, college.Nombre]));
    } catch (error) {
      console.error('Error loading colleges:', error);
      this.colleges = [];
    }
  }

  getCollegeName(id: string): string {
    return this.collegeMap.get(id) || 'Unknown College';
  }

  async loadConductores() {
    try {
      this.conductores = await this.firebaseService.getConductor();
      this.conductorMap = new Map(
        this.conductores.map(conductor => [
          conductor.RUT,
          `${conductor.Nombre} ${conductor.Apellido} (${conductor.RUT})`
        ])
      );
    } catch (error) {
      console.error('Error loading conductores:', error);
      this.conductores = [];
    }
  }

  getConductorName(rut: string): string {
    return this.conductorMap.get(rut) || 'Unknown Conductor';
  }
}
