import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[appNumbersOnly]',
  standalone: true
})
//Directiva para validar que solo se ingresen números
export class NumbersOnlyDirective {
  constructor(private el: ElementRef) {}
  //Escucha el evento input y valida que solo se ingresen números
  @HostListener('input', ['$event']) onInputChange(event: Event) {
    const initialValue = this.el.nativeElement.value;
    this.el.nativeElement.value = initialValue.replace(/[^0-9]*/g, '');
    if (initialValue !== this.el.nativeElement.value) {
      event.stopPropagation();
    }
  }
}