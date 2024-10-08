import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FirebaseService, Apoderado, College } from '../../../services/firebase.service';
import { CommonModule } from '@angular/common';
import { NumbersOnlyDirective } from '../../../validators/numbers-only.validator';  // Add this import

@Component({
  selector: 'app-parent',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NumbersOnlyDirective],  // Add NumbersOnlyDirective here
  templateUrl: './parent.component.html',
  styleUrls: ['./parent.component.scss']
})
export class ParentComponent implements OnInit {
  apoderadoForm: FormGroup;
  apoderados: Apoderado[] = [];
  colleges: College[] = [];  // Add this line

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService
  ) {
    this.apoderadoForm = this.fb.group({
      RUT: ['', [Validators.required, Validators.maxLength(20)]],
      Nombre: ['', [Validators.required, Validators.maxLength(20)]],
      Apellido: ['', [Validators.required, Validators.maxLength(20)]],
      Email: ['', [Validators.required, Validators.email, Validators.maxLength(50)]],
      Telefono: ['', [Validators.required, Validators.maxLength(20)]],
      FK_APColegio: ['', Validators.required],
      Imagen: ['', Validators.maxLength(20)]
    });
  }

  ngOnInit() {
    this.loadApoderados();
    this.loadColleges();  // Add this line
  }

  async loadApoderados() {
    this.apoderados = await this.firebaseService.getApoderados();
  }

  async loadColleges() {  // Add this method
    this.colleges = await this.firebaseService.getColleges();
  }

  async onSubmit() {
    if (this.apoderadoForm.valid) {
      const apoderadoData = this.apoderadoForm.value;
      try {
        await this.firebaseService.addOrUpdateApoderado(apoderadoData);
        console.log('Apoderado saved successfully');
        this.apoderadoForm.reset();
        this.loadApoderados();
      } catch (error) {
        console.error('Error submitting apoderado:', error);
      }
    } else {
      console.log('Form is invalid', this.apoderadoForm.errors);
    }
  }

  editApoderado(apoderado: Apoderado) {
    this.apoderadoForm.patchValue(apoderado);
  }

  async deleteApoderado(rut: string) {
    if (confirm('¿Estás seguro de que quieres eliminar este apoderado?')) {
      await this.firebaseService.deleteApoderado(rut);
      this.loadApoderados();
    }
  }
}
