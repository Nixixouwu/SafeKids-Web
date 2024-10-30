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
  // Variables principales para el manejo del formulario y datos
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
    // Inicialización del formulario con validaciones
    this.apoderadoForm = this.fb.group({
      Nombre: ['', Validators.required],
      Apellido: ['', Validators.required],
      RUT: ['', [Validators.required, rutValidator()]],
      Email: ['', [Validators.required, Validators.email]],
      Telefono: ['', Validators.required],
      FK_APColegio: ['', Validators.required],
      Imagen: [''],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  // Inicialización del componente y carga de datos
  ngOnInit() {
    this.loadApoderados();
    this.loadColleges();
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

  // Método para manejar el envío del formulario
  async onSubmit() {
    if (this.apoderadoForm.valid) {
      try {
        const apoderadoData = this.apoderadoForm.getRawValue();
        
        // Verificación de RUT duplicado
        const existingParent = this.apoderados.find(parent => parent.RUT === apoderadoData.RUT);
        
        if (existingParent && !this.isEditing) {
          alert('Ya existe un apoderado con este RUT. Por favor, use un RUT diferente.');
          return;
        }

        // Lógica diferente para edición y creación
        if (this.isEditing) {
          const { password, ...updateData } = apoderadoData;
          await this.firebaseService.addOrUpdateApoderado(updateData);
        } else {
          await this.firebaseService.createParentUser(apoderadoData);
        }

        this.resetForm();
        this.loadApoderados();
      } catch (error) {
        alert('Ocurrió un error al guardar el apoderado. Por favor, intente nuevamente.');
      }
    }
  }

  // Método para editar un apoderado existente
  editApoderado(apoderado: Apoderado) {
    this.isEditing = true;
    this.currentParentRut = apoderado.RUT;
    this.apoderadoForm.patchValue(apoderado);
    
    // Deshabilita campos que no se deben editar
    this.apoderadoForm.get('RUT')?.disable();
    this.apoderadoForm.get('Email')?.disable();
    
    // Elimina validación de contraseña en modo edición
    this.apoderadoForm.get('password')?.clearValidators();
    this.apoderadoForm.get('password')?.updateValueAndValidity();
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
  }

  // Método para eliminar un apoderado
  async deleteApoderado(rut: string) {
    if (confirm('¿Estás seguro de que quieres eliminar este apoderado?')) {
      await this.firebaseService.deleteApoderado(rut);
      this.loadApoderados();
    }
  }
}
