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
  // Variables principales para el manejo del formulario y datos
  colegioForm: FormGroup;
  colegios: College[] = [];
  editingCollegeId: string | null = null; // ID del colegio en edición
  isEditing: boolean = false;
  currentCollegeId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService
  ) {
    // Inicialización del formulario con validaciones para colegios
    this.colegioForm = this.fb.group({
      Nombre: ['', Validators.required],
      Direccion: ['', Validators.required],
      Email: ['', [Validators.required, Validators.email]],
      Telefono: ['', Validators.required],
      Encargado: ['', Validators.required]
    });
  }

  // Inicialización del componente y carga de datos
  ngOnInit() {
    this.loadColegios();
  }

  // Método para cargar la lista de colegios
  async loadColegios() {
    this.colegios = await this.firebaseService.getColleges();
  }

  // Método para manejar el envío del formulario
  async onSubmit() {
    if (this.colegioForm.valid) {
      try {
        const colegioData = this.colegioForm.value;
        
        // Si está en modo edición, incluye el ID del colegio
        if (this.isEditing && this.currentCollegeId) {
          colegioData.id = this.currentCollegeId;
        }

        // Guardado o actualización del colegio
        await this.firebaseService.addOrUpdateColegio(colegioData);
        this.resetForm();
        this.loadColegios();
      } catch (error) {
        alert('Ocurrió un error al guardar el colegio. Por favor, intente nuevamente.');
      }
    }
  }

  // Método para editar un colegio existente
  editColegio(colegio: College) {
    this.isEditing = true;
    this.currentCollegeId = colegio.id;
    this.colegioForm.patchValue(colegio);
  }

  // Método para reiniciar el formulario
  resetForm() {
    this.colegioForm.reset();
    this.isEditing = false;
    this.currentCollegeId = null;
  }

  // Método para eliminar un colegio
  async deleteColegio(id: string) {
    if (confirm('¿Estás seguro de que quieres eliminar este colegio?')) {
      await this.firebaseService.deleteCollege(id);
      this.loadColegios();
    }
  }
}
