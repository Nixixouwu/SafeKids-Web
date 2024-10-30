import { AbstractControl, ValidatorFn } from '@angular/forms';

//Formatea el RUT
export function formatRut(rut: string): string {
  //Elimina todos los caracteres no alfanuméricos
  rut = rut.replace(/[^0-9kK]/g, '');
  
  //Asegura que solo haya un 'K' al final
  rut = rut.replace(/k/gi, 'K');
  if (rut.indexOf('K') !== -1 && rut.indexOf('K') !== rut.length - 1) {
    rut = rut.replace(/K/g, '');
    rut += 'K';
  }
  
  //Si hay más de un caracter, separa el último con un guión
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

    //Elimina todos los caracteres no alfanuméricos
    let rut = value.replace(/[^0-9kK]/g, '');
    
    //Verifica que el RUT contenga solo números y opcionalmente una K al final
    if (!/^[0-9]+[kK]?$/.test(rut)) {
      return { 'rutInvalid': 'RUT debe contener solo números y opcionalmente una K al final' };
    }
    
    //Separa el cuerpo y el dígito verificador
    let cuerpo = rut.slice(0,-1);
    let dv = rut.slice(-1).toUpperCase();
    
    //Si no cumple con la longitud mínima
    if(cuerpo.length < 7) { 
      return { 'rutInvalid': 'RUT Incompleto' };
    }
    
    //Calcula el dígito verificador
    let suma = 0;
    let multiplo = 2;
    
    for(let i=1; i<=cuerpo.length; i++) {
      let index = multiplo * parseInt(rut.charAt(cuerpo.length - i));
      suma = suma + index;
      if(multiplo < 7) { multiplo = multiplo + 1; } else { multiplo = 2; }
    }
    
    let dvEsperado = 11 - (suma % 11);
    
    //Convierte el dígito verificador esperado a string
    let dvEsperadoStr = (dvEsperado === 11) ? '0' : (dvEsperado === 10) ? 'K' : dvEsperado.toString();
    
    if(dvEsperadoStr !== dv) { 
      return { 'rutInvalid': 'RUT Inválido' };
    }
    
    return null;
  };
}