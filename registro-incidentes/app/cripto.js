// Formato de los datos firmados, huellas y firmas. Tiene que coincidir byte a
// byte con apps-script/Codigo.gs (lo comprueban las pruebas de tests/).

export const PROTOCOLO = 'registro-incidentes/v1';
export const GENESIS = '0'.repeat(64);

const codificador = new TextEncoder();
const ECDSA = { name: 'ECDSA', namedCurve: 'P-256' };
const FIRMA = { name: 'ECDSA', hash: 'SHA-256' };

export function datosFirmados({ firmante, historial, texto, creado, nonce, declaracion }) {
  return JSON.stringify([PROTOCOLO, firmante, historial, texto, creado, nonce, declaracion]);
}

export async function sha256Hex(texto) {
  const resumen = await crypto.subtle.digest('SHA-256', codificador.encode(texto));
  return Array.from(new Uint8Array(resumen), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function huellaCadena({ numero, recibido, firmante, clave, huellaContenido, firma, huellaAnterior }) {
  return sha256Hex(JSON.stringify([PROTOCOLO + '/cadena', numero, recibido, firmante, clave, huellaContenido, firma, huellaAnterior]));
}

export function huellaBitacora({ numero, recibido, evento, firmante, detalle, huellaAnterior }) {
  return sha256Hex(JSON.stringify([PROTOCOLO + '/bitacora', numero, recibido, evento, firmante, detalle, huellaAnterior]));
}

export function huellaClave(jwk) {
  return sha256Hex(JSON.stringify(['EC', 'P-256', jwk.x, jwk.y]));
}

export function aBase64Url(bytes) {
  let binario = '';
  new Uint8Array(bytes).forEach((b) => { binario += String.fromCharCode(b); });
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function deBase64Url(texto) {
  const b64 = texto.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0));
}

export function nonceAleatorio() {
  return aBase64Url(crypto.getRandomValues(new Uint8Array(18)));
}

/** Par de claves con la privada no exportable: ni la propia página puede leerla. */
export function generarClaves() {
  return crypto.subtle.generateKey(ECDSA, false, ['sign', 'verify']);
}

export async function clavePublicaJwk(clavePublica) {
  const { kty, crv, x, y } = await crypto.subtle.exportKey('jwk', clavePublica);
  return { kty, crv, x, y };
}

export async function firmar(clavePrivada, datos) {
  return aBase64Url(await crypto.subtle.sign(FIRMA, clavePrivada, codificador.encode(datos)));
}

export async function verificarFirma(jwk, datos, firma) {
  try {
    const clave = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y }, ECDSA, false, ['verify']);
    return await crypto.subtle.verify(FIRMA, clave, deBase64Url(firma), codificador.encode(datos));
  } catch {
    return false;
  }
}

export function normalizarTexto(texto) {
  return texto.normalize('NFC').replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
}

export function normalizarHistorial(historial) {
  return historial.normalize('NFC').toUpperCase().replace(/\s+/g, '');
}

/**
 * Comprueba una exportación de la hoja (menú «Exportar para verificar las firmas»):
 * firma de cada dispositivo, huella del contenido, las dos cadenas y las anclas.
 */
export async function verificarExportacion(exportacion) {
  if (!exportacion || exportacion.protocolo !== PROTOCOLO || !Array.isArray(exportacion.partes)) {
    throw new Error('Esto no parece una exportación del registro de incidentes.');
  }
  const claves = new Map((exportacion.claves || []).map((c) => [c.huella, c]));
  const cadenaPorNumero = new Map([['0', GENESIS]]);
  const partes = [];
  let anterior = GENESIS;
  for (const [i, p] of exportacion.partes.entries()) {
    const problemas = [];
    if (p.numero !== String(i + 1)) problemas.push(`Se esperaba el nº ${i + 1}: falta o sobra un parte.`);
    let datos = null;
    try { datos = JSON.parse(p.datos); } catch { /* se informa abajo */ }
    if (!Array.isArray(datos) || datos[0] !== PROTOCOLO || datos[1] !== p.firmante) problemas.push('Los datos firmados no tienen el formato esperado.');
    const contenidoOk = (await sha256Hex(p.datos)) === p.huellaContenido;
    if (!contenidoOk) problemas.push('El contenido no coincide con su huella.');
    const clave = claves.get(p.clave);
    let firmaOk = false;
    if (!clave) problemas.push('No se encuentra la clave del dispositivo.');
    else if (clave.firmante !== p.firmante || (await huellaClave(clave.jwk)) !== p.clave) problemas.push('La clave no corresponde a este firmante.');
    else {
      firmaOk = await verificarFirma(clave.jwk, p.datos, p.firma);
      if (!firmaOk) problemas.push('La firma del dispositivo no es válida para estos datos.');
    }
    const enlaceOk = p.huellaAnterior === anterior;
    if (!enlaceOk) problemas.push('No enlaza con el parte anterior.');
    const cadenaOk = enlaceOk && (await huellaCadena(p)) === p.huellaCadena;
    if (enlaceOk && !cadenaOk) problemas.push('La huella de la cadena no cuadra.');
    partes.push({
      numero: p.numero,
      firmante: p.firmante,
      nombre: p.nombre || '',
      dispositivo: clave ? `${clave.tipo || 'Dispositivo'} · alta ${String(clave.desde || '').slice(0, 10)}` : '',
      fecha: Array.isArray(datos) ? datos[4] : '',
      firmaOk,
      contenidoOk,
      cadenaOk,
      problemas,
    });
    cadenaPorNumero.set(p.numero, p.huellaCadena);
    anterior = p.huellaCadena;
  }

  // Bitácora: altas, bajas, bloqueos y cambios de ajustes.
  const bitacoraPorNumero = new Map([['0', GENESIS]]);
  const bitacora = { total: 0, problemas: [] };
  let anteriorB = GENESIS;
  for (const [i, b] of (exportacion.bitacora || []).entries()) {
    if (b.numero !== String(i + 1)) bitacora.problemas.push(`Bitácora: se esperaba el evento nº ${i + 1} y aparece el ${b.numero}.`);
    if (b.huellaAnterior !== anteriorB) bitacora.problemas.push(`Bitácora nº ${b.numero}: no enlaza con el evento anterior.`);
    else if ((await huellaBitacora(b)) !== b.huella) bitacora.problemas.push(`Bitácora nº ${b.numero}: el evento se ha modificado.`);
    bitacoraPorNumero.set(b.numero, b.huella);
    anteriorB = b.huella;
    bitacora.total++;
  }

  const anclas = (exportacion.anclas || []).map((a) => ({
    ...a,
    ok: cadenaPorNumero.get(a.numero) === a.huella &&
      (a.numeroBitacora === undefined || bitacoraPorNumero.get(a.numeroBitacora) === a.huellaBitacora),
  }));
  const ok = partes.every((p) => p.problemas.length === 0) && !bitacora.problemas.length && anclas.every((a) => a.ok);
  return { ok, partes, bitacora, anclas };
}
