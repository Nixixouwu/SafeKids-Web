import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HeaderComponent } from '../../components/header/header.component';
import { CommonModule } from '@angular/common';
import { NumbersOnlyDirective } from '../../validators/numbers-only.validator';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [
    HeaderComponent,
    ReactiveFormsModule,
    CommonModule,
    NumbersOnlyDirective,
    HttpClientModule
  ],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss'
})
export class ContactComponent implements OnInit {
  contactForm!: FormGroup;
  formSubmitted = false;
  formError = false;

  constructor(private fb: FormBuilder, private http: HttpClient) {}

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
      const formspreeUrl = 'https://formspree.io/f/movagekg'; // Replace with your Formspree form ID
      this.http.post(formspreeUrl, this.contactForm.value)
        .subscribe(
          response => {
            console.log('Form submitted successfully', response);
            this.formSubmitted = true;
            this.contactForm.reset();
          },
          error => {
            console.error('Error submitting form', error);
            this.formError = true;
          }
        );
    }
  }
}
