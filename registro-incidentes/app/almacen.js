// Lo único que se guarda en el dispositivo: quién está dado de alta en él y su
// clave de firma (no exportable). Nunca se guardan partes ni datos de pacientes.

const BASE = 'registro-incidentes';
const ALMACEN = 'personas';

function abrir() {
  return new Promise((resolver, rechazar) => {
    const peticion = indexedDB.open(BASE, 1);
    peticion.onupgradeneeded = () => peticion.result.createObjectStore(ALMACEN, { keyPath: 'firmante' });
    peticion.onsuccess = () => resolver(peticion.result);
    peticion.onerror = () => rechazar(peticion.error);
  });
}

async function operar(modo, accion) {
  const bd = await abrir();
  try {
    return await new Promise((resolver, rechazar) => {
      const tx = bd.transaction(ALMACEN, modo);
      const peticion = accion(tx.objectStore(ALMACEN));
      tx.oncomplete = () => resolver(peticion && peticion.result);
      tx.onerror = () => rechazar(tx.error);
      tx.onabort = () => rechazar(tx.error);
    });
  } finally {
    bd.close();
  }
}

export async function personas() {
  const todas = (await operar('readonly', (s) => s.getAll())) || [];
  return todas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export function guardarPersona(persona) {
  return operar('readwrite', (s) => s.put(persona));
}

export function borrarPersona(firmante) {
  return operar('readwrite', (s) => s.delete(firmante));
}
