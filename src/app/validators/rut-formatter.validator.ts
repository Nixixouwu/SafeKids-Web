import { Directive, HostListener, ElementRef } from '@angular/core';
import { NgControl } from '@angular/forms';
import { formatRut } from './rut.validator';

@Directive({
  selector: '[appRutFormatter]',
  standalone: true
})
export class RutFormatterDirective {
  constructor(private el: ElementRef, private ngControl: NgControl) {}

  @HostListener('input', ['$event'])
  onInput(event: InputEvent) {
    const input = event.target as HTMLInputElement;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const previousValue = input.value;

    const formatted = formatRut(input.value);
    this.ngControl.control?.setValue(formatted, { emitEvent: false });

    // Adjust cursor position
    let newCursorPos = start + (formatted.length - previousValue.length);
    if (formatted.charAt(newCursorPos) === '-') {
      newCursorPos++;
    }
    input.setSelectionRange(newCursorPos, newCursorPos);
  }

  @HostListener('blur')
  onBlur() {
    const input = this.el.nativeElement;
    const formatted = formatRut(input.value);
    this.ngControl.control?.setValue(formatted, { emitEvent: false });
  }
}