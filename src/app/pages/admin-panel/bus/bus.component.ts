import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FirebaseService, Bus } from '../../../services/firebase.service';
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

  constructor(private fb: FormBuilder, private firebaseService: FirebaseService) {
    this.busForm = this.fb.group({
      FK_BUColegio: ['', Validators.required],
      FK_BUConductor: ['', Validators.required],
      ID_Placa: ['', Validators.required],
      Imagen: ['', Validators.required],
      Modelo: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.loadBuses();
  }

  async loadBuses() {
    this.buses = await this.firebaseService.getBuses();
  }

  async onSubmit() {
    if (this.busForm.valid) {
      const busData: Bus = this.busForm.value;
      try {
        await this.firebaseService.addOrUpdateBus(busData);
        console.log('Bus guardado exitosamente');
        this.busForm.reset();
        this.loadBuses();
      } catch (error) {
        console.error('Error al guardar el bus:', error);
      }
    } else {
      console.log('El formulario es inválido', this.busForm.errors);
    }
  }

  editBus(bus: Bus) {
    this.busForm.patchValue(bus);
  }

  async deleteBus(idPlaca: string) {
    if (confirm('¿Estás seguro de que quieres eliminar este bus?')) {
      await this.firebaseService.deleteBus(idPlaca);
      this.loadBuses();
    }
  }
}
