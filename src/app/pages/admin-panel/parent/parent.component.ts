import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FirebaseService, Apoderado, College } from '../../../services/firebase.service';
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
  apoderadoForm: FormGroup;
  apoderados: Apoderado[] = [];
  colleges: College[] = [];
  collegeMap: Map<string, string> = new Map();
  currentAdminCollege: string | null = null;
  isEditing: boolean = false;
  currentParentRut: string | null = null;

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService,
    private adminPanelComponent: AdminPanelComponent
  ) {
    this.apoderadoForm = this.fb.group({
      RUT: ['', [Validators.required, rutValidator()]],
      Nombre: ['', [Validators.required, Validators.maxLength(20)]],
      Apellido: ['', [Validators.required, Validators.maxLength(20)]],
      Email: ['', [Validators.required, Validators.email, Validators.maxLength(50)]],
      Telefono: ['', [Validators.required, Validators.maxLength(20)]],
      FK_APColegio: ['', Validators.required],
      Imagen: ['', Validators.maxLength(200)]
    });
  }

  ngOnInit() {
    this.loadApoderados();
    this.loadColleges();
  }

  async loadCurrentAdminData() {
    try {
      const currentUser = await firstValueFrom(this.firebaseService.getCurrentUser());
      if (currentUser) {
        const adminData = await this.firebaseService.getAdminData(currentUser);
        if (adminData) {
          this.currentAdminCollege = adminData.fk_adcolegio;
          console.log('Current admin college:', this.currentAdminCollege);
        }
      }
    } catch (error) {
      console.error('Error loading current admin data:', error);
    }
  }

  async loadApoderados() {
    combineLatest([
      this.adminPanelComponent.isSuperAdmin$,
      this.adminPanelComponent.currentAdminCollege$
    ]).pipe(
      switchMap(([isSuperAdmin, collegeId]) => {
        console.log('Is Super Admin:', isSuperAdmin, 'College ID:', collegeId);
        if (isSuperAdmin) {
          return this.firebaseService.getApoderados();
        } else {
          return collegeId ? this.firebaseService.getApoderadosByCollege(collegeId) : of([]);
        }
      })
    ).subscribe(
      apoderados => {
        this.apoderados = apoderados;
        console.log('Loaded apoderados:', this.apoderados);
      },
      error => {
        console.error('Error loading apoderados:', error);
        this.apoderados = [];
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

  getCollegeName(id: string): string {
    return this.collegeMap.get(id) || 'Unknown College';
  }

  async onSubmit() {
    if (this.apoderadoForm.valid) {
      const apoderadoData = this.apoderadoForm.value;
      
      try {
        const existingParent = this.apoderados.find(parent => parent.RUT === apoderadoData.RUT);
        
        if (existingParent && !this.isEditing) {
          alert('Ya existe un apoderado con este RUT. Por favor, use un RUT diferente.');
          return;
        }

        await this.firebaseService.addOrUpdateApoderado(apoderadoData);
        console.log('Apoderado guardado exitosamente');
        this.apoderadoForm.reset();
        this.isEditing = false;
        this.currentParentRut = null;
        this.loadApoderados();
      } catch (error) {
        console.error('Error al guardar el apoderado:', error);
        alert('Ocurrió un error al guardar el apoderado. Por favor, intente nuevamente.');
      }
    }
  }

  editApoderado(apoderado: Apoderado) {
    this.isEditing = true;
    this.currentParentRut = apoderado.RUT;
    this.apoderadoForm.patchValue(apoderado);
  }

  resetForm() {
    this.apoderadoForm.reset();
    this.isEditing = false;
    this.currentParentRut = null;
  }

  async deleteApoderado(rut: string) {
    if (confirm('¿Estás seguro de que quieres eliminar este apoderado?')) {
      await this.firebaseService.deleteApoderado(rut);
      this.loadApoderados();
    }
  }
}
