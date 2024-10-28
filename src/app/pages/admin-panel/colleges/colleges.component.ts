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
      const colegioData = this.colegioForm.value;
      try {
        if (this.editingCollegeId) {
          // Update existing college
          await this.firebaseService.addOrUpdateColegio({ ...colegioData, id: this.editingCollegeId });
          console.log('College updated successfully');
        } else {
          // Add new college
          const newId = await this.firebaseService.addCollege(colegioData);
          console.log('New college added with ID:', newId);
        }
        this.colegioForm.reset();
        this.editingCollegeId = null; // Reset the editing ID
        this.loadColegios();
      } catch (error) {
        console.error('Error submitting college:', error);
      }
    } else {
      console.log('Form is invalid', this.colegioForm.errors);
    }
  }

  editColegio(colegio: College) {
    this.colegioForm.patchValue(colegio);
    this.editingCollegeId = colegio.id; // Set the ID of the college being edited
  }

  async deleteColegio(id: string) {
    if (confirm('¿Estás seguro de que quieres eliminar este colegio?')) {
      await this.firebaseService.deleteCollege(id);
      this.loadColegios();
    }
  }
}
