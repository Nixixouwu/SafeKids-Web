import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FirebaseService, College } from '../../../services/firebase.service';
import { CommonModule } from '@angular/common';
import { NumbersOnlyDirective } from '../../../validators/numbers-only.validator';

@Component({
  selector: 'app-colleges',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NumbersOnlyDirective],
  templateUrl: './colleges.component.html',
  styleUrls: ['./colleges.component.scss']
})
export class CollegesComponent implements OnInit {
  colegioForm: FormGroup;
  colegios: College[] = [];
  editingCollegeId: string | null = null; // Track the ID of the college being edited
  isEditing: boolean = false;
  currentCollegeId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService
  ) {
    this.colegioForm = this.fb.group({
      Nombre: ['', Validators.required],
      Direccion: ['', Validators.required],
      Email: ['', [Validators.required, Validators.email]],
      Telefono: ['', Validators.required],
      Encargado: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadColegios();
  }

  async loadColegios() {
    this.colegios = await this.firebaseService.getColleges();
  }

  async onSubmit() {
    if (this.colegioForm.valid) {
      try {
        const colegioData = this.colegioForm.value;
        
        if (this.isEditing && this.currentCollegeId) {
          // If editing, include the ID
          colegioData.id = this.currentCollegeId;
        }

        await this.firebaseService.addOrUpdateColegio(colegioData);
        console.log('Colegio guardado exitosamente');
        this.colegioForm.reset();
        this.isEditing = false;
        this.currentCollegeId = null;
        this.loadColegios();
      } catch (error) {
        console.error('Error al guardar el colegio:', error);
        alert('Ocurrió un error al guardar el colegio. Por favor, intente nuevamente.');
      }
    }
  }

  editColegio(colegio: College) {
    this.isEditing = true;
    this.currentCollegeId = colegio.id;
    this.colegioForm.patchValue(colegio);
  }

  resetForm() {
    this.colegioForm.reset();
    this.isEditing = false;
    this.currentCollegeId = null;
  }

  async deleteColegio(id: string) {
    if (confirm('¿Estás seguro de que quieres eliminar este colegio?')) {
      await this.firebaseService.deleteCollege(id);
      this.loadColegios();
    }
  }
}
