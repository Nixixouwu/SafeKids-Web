import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FirebaseService, College } from '../../../services/firebase.service';
import { CommonModule } from '@angular/common';
import { NumbersOnlyDirective } from '../../../validators/numbers-only.validator';  // Add this import

@Component({
  selector: 'app-colleges',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NumbersOnlyDirective],  // Add NumbersOnlyDirective here
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
        const newId = await this.firebaseService.addCollege(colegioData);
        console.log('New college added with ID:', newId);
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
