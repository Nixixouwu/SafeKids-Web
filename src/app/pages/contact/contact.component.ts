import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HeaderComponent } from '../../components/header/header.component';
import { CommonModule } from '@angular/common';
import { NumbersOnlyDirective } from '../../validators/numbers-only.validator';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [HeaderComponent, ReactiveFormsModule, CommonModule, NumbersOnlyDirective],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss'
})
export class ContactComponent implements OnInit {
  contactForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.contactForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      institution: ['', Validators.required],
      phone: ['', [Validators.pattern('^[0-9]*$')]],
      message: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.contactForm.valid) {
      console.log(this.contactForm.value);
      // Here you can add the logic to send the form data
    }
  }
}
