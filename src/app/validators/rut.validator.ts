import { AbstractControl, ValidatorFn } from '@angular/forms';

export function formatRut(rut: string): string {
  // Remove all non-alphanumeric characters
  rut = rut.replace(/[^0-9kK]/g, '');
  
  // Ensure only one 'K' at the end
  rut = rut.replace(/k/gi, 'K');
  if (rut.indexOf('K') !== -1 && rut.indexOf('K') !== rut.length - 1) {
    rut = rut.replace(/K/g, '');
    rut += 'K';
  }
  
  // If there's more than one character, separate the last one with a dash
  if (rut.length > 1) {
    return rut.slice(0, -1) + '-' + rut.slice(-1);
  }
  
  return rut;
}

export function rutValidator(): ValidatorFn {
  return (control: AbstractControl): {[key: string]: any} | null => {
    const value = control.value;
    if (!value) {
      return null;
    }

    // Remove all non-alphanumeric characters
    let rut = value.replace(/[^0-9kK]/g, '');
    
    // Check if RUT contains only numbers and possibly a 'K' at the end
    if (!/^[0-9]+[kK]?$/.test(rut)) {
      return { 'rutInvalid': 'RUT debe contener solo números y opcionalmente una K al final' };
    }
    
    // Separate body and verifier digit
    let cuerpo = rut.slice(0,-1);
    let dv = rut.slice(-1).toUpperCase();
    
    // If it doesn't meet the minimum length
    if(cuerpo.length < 7) { 
      return { 'rutInvalid': 'RUT Incompleto' };
    }
    
    // Calculate Verifier Digit
    let suma = 0;
    let multiplo = 2;
    
    for(let i=1; i<=cuerpo.length; i++) {
      let index = multiplo * parseInt(rut.charAt(cuerpo.length - i));
      suma = suma + index;
      if(multiplo < 7) { multiplo = multiplo + 1; } else { multiplo = 2; }
    }
    
    let dvEsperado = 11 - (suma % 11);
    
    // Convert dvEsperado to string
    let dvEsperadoStr = (dvEsperado === 11) ? '0' : (dvEsperado === 10) ? 'K' : dvEsperado.toString();
    
    if(dvEsperadoStr !== dv) { 
      return { 'rutInvalid': 'RUT Inválido' };
    }
    
    return null;
  };
}