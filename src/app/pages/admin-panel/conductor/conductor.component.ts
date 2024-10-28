import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FirebaseService, Conductor } from '../../../services/firebase.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { combineLatest, of } from 'rxjs'; // Ensure 'of' is also imported
import { AdminPanelComponent } from '../admin-panel.component';
import { switchMap } from 'rxjs/operators'; // Add this import
import { firstValueFrom } from 'rxjs'; // Add this import

@Component({
  selector: 'app-conductor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './conductor.component.html',
  styleUrls: ['./conductor.component.scss']
})
export class ConductorComponent implements OnInit {
  conductorForm: FormGroup;
  conductores: Conductor[] = [];

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService,
    private adminPanelComponent: AdminPanelComponent // Inyección del componente
  ) {
    this.conductorForm = this.fb.group({
      Apellido: ['', Validators.required],
      Direccion: ['', Validators.required],
      Edad: ['', [Validators.required, Validators.min(18), Validators.max(65)]],
      Genero: ['', Validators.required],
      Imagen: [''],
      Nombre: ['', Validators.required],
      RUT: ['', [Validators.required]],
      Email: ['', [Validators.required, Validators.email]],
      FK_COBus: ['', Validators.required],
      FK_COColegio: ['', Validators.required],
      Fecha_Admision: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.loadConductores();
  }

  async loadConductores() {
    this.conductores = await this.firebaseService.getConductor();
    console.log('Loaded conductores:', this.conductores);
  }

  async onSubmit() {
    if (this.conductorForm.valid) {
      const conductorData: Conductor = this.conductorForm.value;
      try {
        await this.firebaseService.addOrUpdateConductor(conductorData);
        console.log('Conductor guardado exitosamente');
        this.conductorForm.reset();
        this.loadConductores(); // Recargar la lista después de guardar
      } catch (error) {
        console.error('Error al guardar el conductor:', error);
      }
    } else {
      console.log('El formulario es inválido', this.conductorForm.errors);
    }
  }

  editConductor(conductor: Conductor) {
    this.conductorForm.patchValue(conductor);
  }

  deleteConductor(rut: string) {
    if (confirm('¿Estás seguro de que quieres eliminar este conductor?')) {
      this.firebaseService.deleteConductor(rut)
        .then(() => {
          console.log('Conductor eliminado exitosamente');
          this.loadConductores(); // Recargar la lista de conductores
        })
        .catch(error => {
          console.error('Error al eliminar el conductor:', error);
          alert('Error al eliminar el conductor. Por favor, inténtalo de nuevo.');
        });
    }
  }
}
