import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FirebaseService, College } from '../../../services/firebase.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-colleges',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './colleges.component.html',
  styleUrls: ['./colleges.component.scss']
})
export class CollegesComponent implements OnInit {
  colegioForm: FormGroup;
  colegios: College[] = [];

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService
  ) {
    this.colegioForm = this.fb.group({
      id: [''],
      Nombre: ['', Validators.required],
      Direccion: ['', Validators.required],
      Email: ['', [Validators.required, Validators.email]],
      Telefono: ['', Validators.required],
      Encargado: ['', Validators.required],
      ID: ['', Validators.required]
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
        if (colegioData.id) {
          // Editing existing college
          await this.firebaseService.updateCollege(colegioData);
          console.log('College updated successfully');
        } else {
          // Creating new college
          const { id, ...newCollegeData } = colegioData;
          const newId = await this.firebaseService.addCollege(newCollegeData);
          console.log('New college added with ID:', newId);
        }
        this.colegioForm.reset();
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
  }

  async deleteColegio(id: string) {
    if (confirm('¿Estás seguro de que quieres eliminar este colegio?')) {
      await this.firebaseService.deleteCollege(id);
      this.loadColegios();
    }
  }
}