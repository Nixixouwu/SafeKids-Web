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
    this.conductorForm = this.fb.group({
      Apellido: ['', Validators.required],
      Direccion: ['', Validators.required],
      Edad: ['', [Validators.required, Validators.min(18), Validators.max(65)]],
      Genero: ['', Validators.required],
      Imagen: [''],
      Nombre: ['', Validators.required],
      RUT: ['', [Validators.required, rutValidator()]],
      Email: ['', [Validators.required, Validators.email]],
      FK_COColegio: ['', Validators.required],
      Fecha_Admision: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.loadConductores();
    this.loadColleges();
  }

  async loadConductores() {
    combineLatest([
      this.adminPanelComponent.isSuperAdmin$,
      this.adminPanelComponent.currentAdminCollege$
    ]).pipe(
      switchMap(([isSuperAdmin, collegeId]) => {
        console.log('Is Super Admin:', isSuperAdmin, 'College ID:', collegeId);
        if (isSuperAdmin) {
          return this.firebaseService.getConductor();
        } else {
          return collegeId ? this.firebaseService.getConductoresByCollege(collegeId) : of([]);
        }
      })
    ).subscribe(
      conductores => {
        this.conductores = conductores;
        console.log('Loaded conductores:', this.conductores);
      },
      error => {
        console.error('Error loading conductores:', error);
        this.conductores = [];
      }
    );
  }

  async loadColleges() {
    combineLatest([
      this.adminPanelComponent.isSuperAdmin$,
      this.adminPanelComponent.currentAdminCollege$
    ]).pipe(
      switchMap(([isSuperAdmin, collegeId]) => {
        console.log('Is Super Admin:', isSuperAdmin, 'College ID:', collegeId);
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
        console.log('Loaded colleges:', this.colleges);
      },
      error => {
        console.error('Error loading colleges:', error);
        this.colleges = [];
      }
    );
  }

  async onSubmit() {
    if (this.conductorForm.valid) {
      const conductorData: Conductor = this.conductorForm.value;
      
      try {
        const existingConductor = this.conductores.find(conductor => conductor.RUT === conductorData.RUT);
        
        if (existingConductor && !this.isEditing) {
          alert('Ya existe un conductor con este RUT. Por favor, use un RUT diferente.');
          return;
        }

        await this.firebaseService.addOrUpdateConductor(conductorData);
        console.log('Conductor guardado exitosamente');
        this.conductorForm.reset();
        this.isEditing = false;
        this.currentConductorRut = null;
        this.loadConductores();
      } catch (error) {
        console.error('Error al guardar el conductor:', error);
        alert('Ocurrió un error al guardar el conductor. Por favor, intente nuevamente.');
      }
    } else {
      console.log('El formulario es inválido', this.conductorForm.errors);
    }
  }

  editConductor(conductor: Conductor) {
    this.isEditing = true;
    this.currentConductorRut = conductor.RUT;
    this.conductorForm.patchValue(conductor);
  }

  deleteConductor(rut: string) {
    if (confirm('¿Estás seguro de que quieres eliminar este conductor?')) {
      this.firebaseService.deleteConductor(rut)
        .then(() => {
          console.log('Conductor eliminado exitosamente');
          this.loadConductores();
        })
        .catch(error => {
          console.error('Error al eliminar el conductor:', error);
          alert('Error al eliminar el conductor. Por favor, inténtalo de nuevo.');
        });
    }
  }

  getCollegeName(id: string): string {
    return this.collegeMap.get(id) || 'Unknown College';
  }

  resetForm() {
    this.conductorForm.reset();
    this.isEditing = false;
    this.currentConductorRut = null;
  }
}
