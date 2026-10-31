// Pruebas del backend (Codigo.gs) con la criptografía real de la página
// (app/cripto.js): si los formatos no coincidieran byte a byte, fallarían.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearEntorno } from './simulador-gas.mjs';
import * as cripto from '../app/cripto.js';

const PIN = '482915';
const TEXTO = 'El paciente protesta porque en recepción le dijeron otro precio para la corona.';

function nuevoEntorno(ajustes = {}) {
  const e = crearEntorno();
  e.gas.configurarCon_(e.libro, { AVISO_EMAILS: 'direccion@clinica.example', CHAT_WEBHOOK: 'https://chat.example/webhook', ...ajustes });
  return e;
}

async function darDeAlta(e, nombre, { pin = PIN, tipo = 'tablet', email = '' } = {}) {
  const { codigo } = e.gas.crearAlta_(e.libro, nombre);
  const claves = await cripto.generarClaves();
  const clavePublica = await cripto.clavePublicaJwk(claves.publicKey);
  const r = e.post({ v: 1, accion: 'alta', codigo, tipo, pin, email, clavePublica });
  assert.equal(r.ok, true, r.error);
  return { ...r, claves, pin };
}

async function firmarParte(persona, { historial = 'H-1024', texto = TEXTO, nonce, declaracion } = {}) {
  const parte = {
    firmante: persona.firmante,
    historial,
    texto,
    creado: new Date().toISOString(),
    nonce: nonce || cripto.nonceAleatorio(),
    declaracion: declaracion || persona.declaracion,
  };
  parte.firma = await cripto.firmar(persona.claves.privateKey, cripto.datosFirmados(parte));
  return parte;
}

function enviar(e, persona, parte, pin = persona.pin) {
  return e.post({ v: 1, accion: 'parte', dispositivo: persona.dispositivo, pin, ...parte });
}

async function registrar(e, persona, opciones) {
  const r = enviar(e, persona, await firmarParte(persona, opciones));
  assert.equal(r.ok, true, r.error);
  return r;
}

test('configurar crea las hojas, el pepper y el disparador del ancla', () => {
  const e = nuevoEntorno();
  for (const nombre of ['Incidentes', 'Firmantes', 'Dispositivos', 'Altas', 'Anclas']) assert.ok(e.hoja(nombre), nombre);
  assert.match(e.propiedades.get('PEPPER'), /^[0-9a-f]{64}$/);
  assert.equal(e.hoja('Incidentes').fila(1)[0], 'Nº');
  e.gas.instalarDisparadorAncla_();
  e.gas.instalarDisparadorAncla_();
  assert.equal(e.disparadores.length, 1);
});

test('alta y parte: queda registrado y los avisos no llevan datos del paciente', async () => {
  const e = nuevoEntorno();
  const ana = await darDeAlta(e, 'Ana Pérez', { email: 'ana@correo.example' });
  assert.equal(ana.firmante, 'E1');
  assert.equal(ana.declaracion, 'Declaro que lo anterior es cierto y que lo registro yo, Ana Pérez.');
  e.correos.length = 0;
  e.peticiones.length = 0;

  const r = await registrar(e, ana, { historial: 'H-1024' });
  assert.equal(r.numero, 1);
  assert.equal(r.resguardo, true);
  assert.match(r.huella, /^[0-9a-f]{64}$/);

  const fila = e.hoja('Incidentes').fila(2);
  assert.equal(fila[e.gas.INC.NUMERO], '1');
  assert.equal(fila[e.gas.INC.NOMBRE], 'Ana Pérez');
  assert.equal(fila[e.gas.INC.HISTORIAL], 'H-1024');
  assert.equal(fila[e.gas.INC.TEXTO], TEXTO);
  assert.equal(fila[e.gas.INC.HUELLA_ANTERIOR], '0'.repeat(64));

  const aviso = e.correos.find((c) => c.to === 'direccion@clinica.example');
  const resguardo = e.correos.find((c) => c.to === 'ana@correo.example');
  assert.ok(aviso && resguardo);
  assert.match(aviso.subject, /nº 1/);
  assert.ok(resguardo.body.includes(r.huella));
  const chat = e.peticiones[0];
  assert.equal(chat.url, 'https://chat.example/webhook');
  for (const texto of [aviso.subject, aviso.body, resguardo.subject, resguardo.body, chat.opciones.payload]) {
    assert.ok(!texto.includes('H-1024'), 'un aviso incluye el nº de historial');
    assert.ok(!texto.includes('corona'), 'un aviso incluye el texto del parte');
  }
});

test('la cadena enlaza los partes y la verificación de la hoja pasa', async () => {
  const e = nuevoEntorno();
  const ana = await darDeAlta(e, 'Ana Pérez');
  const r1 = await registrar(e, ana);
  const r2 = await registrar(e, ana, { historial: '2231', texto: 'Se ha roto una corona y el paciente vuelve molesto.' });
  assert.equal(r2.numero, 2);
  assert.equal(e.hoja('Incidentes').fila(3)[e.gas.INC.HUELLA_ANTERIOR], r1.huella);
  const v = e.gas.verificarCadena_(e.libro);
  assert.equal(v.ok, true, v.resumen);
  assert.equal(v.total, 2);
});

test('PIN incorrecto: descuenta intentos, bloquea al quinto y dirección desbloquea', async () => {
  const e = nuevoEntorno();
  const ana = await darDeAlta(e, 'Ana Pérez');
  const parte = await firmarParte(ana);
  for (let restantes = 4; restantes >= 1; restantes--) {
    const r = enviar(e, ana, parte, '000001');
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'pin');
    assert.equal(r.restantes, restantes);
  }
  e.correos.length = 0;
  const bloqueo = enviar(e, ana, parte, '000001');
  assert.equal(bloqueo.motivo, 'bloqueado');
  assert.ok(e.correos.some((c) => /PIN bloqueado/.test(c.subject)));
  assert.equal(enviar(e, ana, parte).motivo, 'bloqueado', 'con el PIN bueno sigue bloqueado');

  e.gas.desbloquearPin_(e.libro, ana.firmante);
  const r = enviar(e, ana, parte);
  assert.equal(r.ok, true, r.error);
  assert.equal(r.numero, 1);
});

test('un dispositivo desconocido no puede firmar ni gasta intentos de PIN', async () => {
  const e = nuevoEntorno();
  const ana = await darDeAlta(e, 'Ana Pérez');
  const parte = await firmarParte(ana);
  const intruso = { ...ana, dispositivo: 'f'.repeat(64) };
  for (let i = 0; i < 8; i++) assert.equal(enviar(e, intruso, parte, '000001').motivo, 'sin_alta');
  assert.equal(enviar(e, ana, parte).ok, true, 'el PIN de Ana no se ha bloqueado');
});

test('reenviar el mismo parte (se cortó la conexión) no lo duplica', async () => {
  const e = nuevoEntorno();
  const ana = await darDeAlta(e, 'Ana Pérez');
  const parte = await firmarParte(ana);
  const r1 = enviar(e, ana, parte);
  e.correos.length = 0;
  const r2 = enviar(e, ana, parte);
  assert.equal(r2.ok, true);
  assert.equal(r2.repetido, true);
  assert.equal(r2.numero, r1.numero);
  assert.equal(e.hoja('Incidentes').getLastRow(), 2);
  assert.equal(e.correos.length, 0, 'no se repiten los avisos');
});

test('varias personas en la misma tablet, cada una con su PIN', async () => {
  const e = nuevoEntorno();
  const ana = await darDeAlta(e, 'Ana Pérez', { pin: '482915' });
  const luis = await darDeAlta(e, 'Luis Gómez', { pin: '730264' });
  assert.equal(enviar(e, luis, await firmarParte(luis), ana.pin).motivo, 'pin', 'el PIN de Ana no vale para Luis');
  assert.equal((await registrar(e, ana)).numero, 1);
  assert.equal((await registrar(e, luis)).numero, 2);
  const dispositivos = e.hoja('Dispositivos');
  assert.equal(dispositivos.fila(2)[e.gas.DIS.TIPO], 'Tablet de la clínica');
  assert.equal(e.gas.verificarCadena_(e.libro).ok, true);
});

test('nuevo código: añadir un dispositivo conserva el anterior; retirarlo lo invalida', async () => {
  const e = nuevoEntorno();
  const ana = await darDeAlta(e, 'Ana Pérez');
  const codigo = e.gas.nuevoCodigoAlta_(e.libro, ana.firmante, false);
  const claves = await cripto.generarClaves();
  const movil = e.post({ v: 1, accion: 'alta', codigo, tipo: 'personal', pin: '591837', email: '', clavePublica: await cripto.clavePublicaJwk(claves.publicKey) });
  assert.equal(movil.ok, true, movil.error);
  const anaMovil = { ...movil, claves, pin: '591837' };
  const anaTablet = { ...ana, pin: '591837' }; // el PIN nuevo vale en todos sus dispositivos
  assert.equal((await registrar(e, anaTablet)).numero, 1);
  assert.equal((await registrar(e, anaMovil)).numero, 2);

  e.gas.nuevoCodigoAlta_(e.libro, ana.firmante, true);
  assert.equal(enviar(e, anaTablet, await firmarParte(anaTablet)).motivo, 'sin_alta');
  assert.equal(enviar(e, anaMovil, await firmarParte(anaMovil)).motivo, 'sin_alta');
});

test('baja: deja de poder firmar, pero sus partes se siguen verificando', async () => {
  const e = nuevoEntorno();
  const ana = await darDeAlta(e, 'Ana Pérez');
  await registrar(e, ana);
  e.gas.darDeBaja_(e.libro, ana.firmante);
  assert.equal(enviar(e, ana, await firmarParte(ana)).motivo, 'sin_alta');
  assert.equal(e.post({ v: 1, accion: 'estado', firmante: ana.firmante, dispositivo: ana.dispositivo }).activo, false);
  const v = await cripto.verificarExportacion(e.gas.exportarVerificacion_(e.libro));
  assert.equal(v.ok, true);
});

test('códigos de alta: no se reutilizan, caducan y se rechazan PIN fáciles', async () => {
  const e = nuevoEntorno();
  const { codigo } = e.gas.crearAlta_(e.libro, 'Ana Pérez');
  const clavePublica = await cripto.clavePublicaJwk((await cripto.generarClaves()).publicKey);
  const alta = (datos) => e.post({ v: 1, accion: 'alta', codigo, tipo: 'tablet', email: '', clavePublica, ...datos });
  assert.match(alta({ pin: '123456' }).error, /fácil/);
  assert.match(alta({ pin: '12345' }).error, /6 cifras/);
  assert.match(alta({ pin: PIN, tipo: 'otro' }).error, /tablet/);
  assert.match(alta({ pin: PIN, codigo: 'ZZZZZZZZ' }).error, /no válido/);
  assert.equal(alta({ pin: PIN }).ok, true);
  assert.match(alta({ pin: PIN }).error, /ya se usó/);

  const segundo = e.gas.crearAlta_(e.libro, 'Luis Gómez');
  const altas = e.hoja('Altas');
  const fila = e.gas.sha256Hex_(segundo.codigo);
  for (let n = 2; n <= altas.getLastRow(); n++) {
    if (altas.fila(n, 5)[0] === fila) altas.poner(n, e.gas.ALT.CADUCA + 1, '2020-01-01T00:00:00.000Z');
  }
  const r = e.post({ v: 1, accion: 'alta', codigo: segundo.codigo, tipo: 'tablet', pin: PIN, email: '', clavePublica });
  assert.match(r.error, /caducado/);
});

test('la clave pública no puede incluir la parte privada', async () => {
  const e = nuevoEntorno();
  const { codigo } = e.gas.crearAlta_(e.libro, 'Ana Pérez');
  const claves = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const privada = await crypto.subtle.exportKey('jwk', claves.privateKey);
  const r = e.post({ v: 1, accion: 'alta', codigo, tipo: 'tablet', pin: PIN, email: '', clavePublica: privada });
  assert.equal(r.ok, false);
});

test('un texto que empieza por = no se convierte en fórmula y se verifica bien', async () => {
  const e = nuevoEntorno();
  const ana = await darDeAlta(e, 'Ana Pérez');
  const texto = '=HYPERLINK("https://malo.example";"pulsa") el paciente escribió esto';
  await registrar(e, ana, { texto });
  assert.equal(e.hoja('Incidentes').fila(2)[e.gas.INC.TEXTO], "'" + texto);
  assert.equal(e.gas.verificarCadena_(e.libro).ok, true);
  assert.equal((await cripto.verificarExportacion(e.gas.exportarVerificacion_(e.libro))).ok, true);
});

test('la verificación detecta partes modificados, borrados y anclas que no cuadran', async () => {
  const e = nuevoEntorno();
  const ana = await darDeAlta(e, 'Ana Pérez');
  await registrar(e, ana);
  await registrar(e, ana, { texto: 'Segundo incidente de prueba con texto suficiente.' });
  e.gas.anclaDiaria();
  await registrar(e, ana, { texto: 'Tercer incidente de prueba con texto suficiente.' });
  const inc = e.hoja('Incidentes');
  const I = e.gas.INC;

  // Alguien edita la columna visible: se nota, y el original firmado sigue intacto.
  inc.poner(2, I.TEXTO + 1, 'Texto cambiado a mano');
  let v = e.gas.verificarCadena_(e.libro);
  assert.equal(v.ok, false);
  assert.ok(v.problemas.some((p) => /columnas visibles/.test(p)));
  inc.poner(2, I.TEXTO + 1, TEXTO);

  // Alguien cambia los datos firmados del parte 2.
  const original = inc.valor(3, I.DATOS + 1);
  inc.poner(3, I.DATOS + 1, original.replace('Segundo', 'Otro'));
  v = e.gas.verificarCadena_(e.libro);
  assert.ok(v.problemas.some((p) => /nº 2: los datos firmados/.test(p)));
  inc.poner(3, I.DATOS + 1, original);

  // Alguien borra el parte 3 (el último): solo la cadena no lo notaría,
  // pero sí el ancla si se hubiera enviado después. Aquí borramos el 2.
  const fila3 = inc.fila(4, 15);
  const fila2 = inc.fila(3, 15);
  fila3.forEach((valor, j) => inc.poner(3, j + 1, valor));
  fila2.forEach((_, j) => inc.poner(4, j + 1, ''));
  v = e.gas.verificarCadena_(e.libro);
  assert.equal(v.ok, false);
  assert.ok(v.problemas.some((p) => /falta o sobra/.test(p)));
  assert.ok(v.problemas.some((p) => /Ancla/.test(p)));
});

test('si dirección reescribe un parte y recalcula las huellas, la firma del dispositivo lo delata', async () => {
  const e = nuevoEntorno();
  const ana = await darDeAlta(e, 'Ana Pérez');
  await registrar(e, ana, { texto: 'El paciente se queja del precio que le dieron en recepción.' });
  const inc = e.hoja('Incidentes');
  const I = e.gas.INC;

  // Reescritura "perfecta": nuevos datos, nueva huella de contenido y nueva cadena.
  const datos = JSON.parse(inc.valor(2, I.DATOS + 1));
  datos[3] = 'Ana reconoce que se equivocó al dar el precio.';
  const nuevos = JSON.stringify(datos);
  const huellaContenido = await cripto.sha256Hex(nuevos);
  const fila = inc.fila(2, 15);
  const huellaCadena = await cripto.huellaCadena({
    numero: fila[I.NUMERO], recibido: fila[I.RECIBIDO], firmante: fila[I.FIRMANTE], clave: fila[I.CLAVE],
    huellaContenido, firma: fila[I.FIRMA], huellaAnterior: fila[I.HUELLA_ANTERIOR],
  });
  inc.poner(2, I.DATOS + 1, nuevos);
  inc.poner(2, I.TEXTO + 1, datos[3]);
  inc.poner(2, I.HUELLA_CONTENIDO + 1, huellaContenido);
  inc.poner(2, I.HUELLA_CADENA + 1, huellaCadena);

  assert.equal(e.gas.verificarCadena_(e.libro).ok, true, 'las huellas solas no lo detectan');
  const v = await cripto.verificarExportacion(e.gas.exportarVerificacion_(e.libro));
  assert.equal(v.ok, false);
  assert.equal(v.partes[0].firmaOk, false, 'la firma del dispositivo no cuadra con el texto reescrito');
});

test('el ancla diaria se guarda y se envía a dirección y a los correos extra', async () => {
  const e = nuevoEntorno({ ANCLA_EMAILS: 'dpd@asesoria.example' });
  const ana = await darDeAlta(e, 'Ana Pérez');
  const r = await registrar(e, ana);
  e.correos.length = 0;
  e.gas.anclaDiaria();
  const correo = e.correos[0];
  assert.equal(correo.to, 'direccion@clinica.example,dpd@asesoria.example');
  assert.ok(correo.body.includes(r.huella));
  assert.equal(e.hoja('Anclas').getLastRow(), 2);
  e.gas.anclaDiaria();
  assert.equal(e.hoja('Anclas').getLastRow(), 2, 'sin partes nuevos no repite el ancla');
});

test('peticiones mal formadas devuelven un error legible', () => {
  const e = nuevoEntorno();
  const crudo = (contents) => JSON.parse(e.gas.doPost({ postData: { contents } }).getContent());
  assert.match(crudo('no es json').error, /mal formada/);
  assert.match(crudo(JSON.stringify({ v: 99, accion: 'parte' })).error, /no es compatible/);
  assert.match(crudo(JSON.stringify({ v: 1, accion: 'borrar-todo' })).error, /desconocida/);
  assert.equal(JSON.parse(e.gas.doPost({}).getContent()).ok, false);
});
