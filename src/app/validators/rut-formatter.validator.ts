import { Directive, HostListener, ElementRef } from '@angular/core';
import { NgControl } from '@angular/forms';
import { formatRut } from './rut.validator';

@Directive({
  selector: '[appRutFormatter]',
  standalone: true
})
//Directiva para formatear el RUT
export class RutFormatterDirective {
  constructor(private el: ElementRef, private ngControl: NgControl) {}
  //Escucha el evento input y formatea el RUT
  @HostListener('input', ['$event'])
  onInput(event: InputEvent) {
    const input = event.target as HTMLInputElement;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const previousValue = input.value;
    //Formatea el RUT
    const formatted = formatRut(input.value);
    this.ngControl.control?.setValue(formatted, { emitEvent: false });

    //Ajusta la posición del cursor
    let newCursorPos = start + (formatted.length - previousValue.length);
    if (formatted.charAt(newCursorPos) === '-') {
      newCursorPos++;
    }
    input.setSelectionRange(newCursorPos, newCursorPos);
  }
  //Escucha el evento blur y formatea el RUT
  @HostListener('blur')
  onBlur() {
    const input = this.el.nativeElement;
    const formatted = formatRut(input.value);
    this.ngControl.control?.setValue(formatted, { emitEvent: false });
  }
}