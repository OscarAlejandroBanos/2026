import CONFIG from '../config.js';
import * as cripto from './cripto.js';
import * as almacen from './almacen.js';

const $ = (id) => document.getElementById(id);
const PANTALLAS = ['cargando', 'config', 'alta', 'parte', 'resultado'];
const PATRON_HISTORIAL = /^[A-Z0-9-]{1,20}$/;
const PINES_FACILES = new Set([
  '000000', '111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888',
  '999999', '123456', '654321', '012345', '543210', '123123', '121212', '112233', '696969',
]);

let personas = []; // quién está dado de alta en este dispositivo
let pendiente = null; // parte firmado, listo para enviar o reenviar sin duplicarse

function mostrar(nombre) {
  for (const p of PANTALLAS) $('pantalla-' + p).hidden = p !== nombre;
  window.scrollTo(0, 0);
}

function mostrarError(id, mensaje) {
  $(id).textContent = mensaje || '';
  $(id).hidden = !mensaje;
}

function ocupado(boton, texto) {
  boton.dataset.texto = boton.textContent;
  boton.textContent = texto;
  boton.disabled = true;
}

function libre(boton) {
  if (boton.dataset.texto) boton.textContent = boton.dataset.texto;
  boton.disabled = false;
}

async function llamar(datos) {
  let respuesta;
  try {
    respuesta = await fetch(CONFIG.API_URL, {
      method: 'POST',
      // text/plain evita la petición previa de CORS, que Apps Script no admite.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ v: 1, ...datos }),
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
    });
  } catch {
    throw new Error('No hay conexión con el registro. Comprueba internet y vuelve a intentarlo.');
  }
  if (!respuesta.ok) throw new Error('El registro no responde (error ' + respuesta.status + '). Prueba en unos minutos.');
  return respuesta.json();
}

function posiblesDatosPersonales(texto) {
  const avisos = [];
  if (/\b\d{8}[A-HJ-NP-TV-Z]\b/i.test(texto) || /\b[XYZ]\d{7}[A-HJ-NP-TV-Z]\b/i.test(texto)) avisos.push('un DNI o NIE');
  if (/(?:\+34[\s.-]?)?\b[6789]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b/.test(texto)) avisos.push('un teléfono');
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(texto)) avisos.push('un correo');
  return avisos;
}

function formatearHuella(huella) {
  return huella.slice(0, 16).toUpperCase().match(/.{4}/g).join(' ') + '…';
}

// --- Alta ---------------------------------------------------------------

function prepararAlta(codigo) {
  const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const instalada = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  $('aviso-ios').hidden = !(esIOS && !instalada);
  const limpio = (codigo || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  $('alta-codigo').value = limpio.length === 8 ? limpio.slice(0, 4) + '-' + limpio.slice(4) : limpio;
  $('alta-cancelar').hidden = !personas.length;
  mostrarError('alta-error', '');
  mostrar('alta');
}

async function enviarAlta(evento) {
  evento.preventDefault();
  mostrarError('alta-error', '');
  const codigo = $('alta-codigo').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const tipo = document.querySelector('input[name="alta-tipo"]:checked')?.value;
  const pin = $('alta-pin').value;
  const email = $('alta-email').value.trim();
  if (codigo.length !== 8) return mostrarError('alta-error', 'El código de alta tiene 8 caracteres (por ejemplo, K7P4-QX9M).');
  if (!tipo) return mostrarError('alta-error', 'Indica qué dispositivo es este.');
  if (!/^\d{6}$/.test(pin)) return mostrarError('alta-error', 'El PIN tiene que tener 6 cifras.');
  if (PINES_FACILES.has(pin)) return mostrarError('alta-error', 'Ese PIN es demasiado fácil de adivinar. Elige otro.');
  if (pin !== $('alta-pin2').value) return mostrarError('alta-error', 'Los dos PIN no coinciden.');

  const boton = $('alta-boton');
  ocupado(boton, 'Dando de alta…');
  try {
    const claves = await cripto.generarClaves();
    const clavePublica = await cripto.clavePublicaJwk(claves.publicKey);
    const r = await llamar({ accion: 'alta', codigo, tipo, pin, email, clavePublica });
    if (!r.ok) return mostrarError('alta-error', r.error);
    await almacen.guardarPersona({
      firmante: r.firmante,
      nombre: r.nombre,
      dispositivo: r.dispositivo,
      clave: r.clave,
      declaracion: r.declaracion,
      tipo,
      claves,
      alta: new Date().toISOString(),
    });
    if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
    $('form-alta').reset();
    history.replaceState(null, '', location.pathname + location.search);
    personas = await almacen.personas();
    prepararParte('Listo, ' + r.nombre + '. Ya puedes firmar partes desde este dispositivo.');
  } catch (e) {
    mostrarError('alta-error', e.message);
  } finally {
    libre(boton);
  }
}

// --- Parte --------------------------------------------------------------

function prepararParte(mensaje) {
  const varios = personas.length > 1;
  $('parte-quien-uno').hidden = varios;
  $('parte-quien-varios').hidden = !varios;
  if (varios) {
    const selector = $('parte-persona');
    selector.replaceChildren(new Option('Elige tu nombre', ''), ...personas.map((p) => new Option(p.nombre, p.firmante)));
  } else if (personas.length) {
    $('parte-nombre').textContent = personas[0].nombre;
  }
  $('parte-mensaje').textContent = mensaje || '';
  $('parte-mensaje').hidden = !mensaje;
  mostrarError('parte-error', '');
  mostrar('parte');
}

function personaElegida() {
  if (personas.length === 1) return personas[0];
  return personas.find((p) => p.firmante === $('parte-persona').value) || null;
}

function revisarTexto() {
  const texto = $('parte-texto').value;
  $('parte-contador').textContent = String(texto.length);
  const avisos = posiblesDatosPersonales(texto);
  $('parte-aviso-datos').textContent = avisos.length
    ? 'Parece que has escrito ' + avisos.join(' y ') + '. Quítalo si no es imprescindible: basta con el nº de historial.'
    : '';
  $('parte-aviso-datos').hidden = !avisos.length;
}

function abrirFirma(evento) {
  evento.preventDefault();
  mostrarError('parte-error', '');
  const persona = personaElegida();
  if (!persona) return mostrarError('parte-error', 'Elige tu nombre en «¿Quién firma?».');
  const historial = cripto.normalizarHistorial($('parte-historial').value);
  const texto = cripto.normalizarTexto($('parte-texto').value);
  if (!PATRON_HISTORIAL.test(historial)) return mostrarError('parte-error', 'Escribe el nº de historial (solo letras, números y guiones).');
  if (texto.length < 5) return mostrarError('parte-error', 'Cuenta un poco más qué ha pasado.');

  // Si se reintenta el mismo parte, se reutiliza la misma firma: así el
  // registro lo reconoce y no lo duplica aunque se cortara la conexión.
  if (!pendiente || pendiente.firmante !== persona.firmante || pendiente.historial !== historial || pendiente.texto !== texto) {
    pendiente = { firmante: persona.firmante, historial, texto };
  }
  $('firma-historial').textContent = historial;
  $('firma-texto').textContent = texto;
  $('firma-declaracion').textContent = persona.declaracion;
  $('firma-pin').value = '';
  mostrarError('firma-error', '');
  $('dialogo-firma').showModal();
  $('firma-pin').focus();
}

async function firmarYEnviar(evento) {
  evento.preventDefault();
  const persona = personas.find((p) => p.firmante === pendiente?.firmante);
  if (!persona) return $('dialogo-firma').close();
  const pin = $('firma-pin').value;
  if (!/^\d{6}$/.test(pin)) return mostrarError('firma-error', 'El PIN tiene 6 cifras.');
  mostrarError('firma-error', '');

  const boton = $('firma-boton');
  ocupado(boton, 'Firmando…');
  try {
    if (!pendiente.firma) {
      pendiente.creado = new Date().toISOString();
      pendiente.nonce = cripto.nonceAleatorio();
      pendiente.declaracion = persona.declaracion;
      pendiente.firma = await cripto.firmar(persona.claves.privateKey, cripto.datosFirmados(pendiente));
    }
    const r = await llamar({
      accion: 'parte',
      firmante: persona.firmante,
      dispositivo: persona.dispositivo,
      pin,
      historial: pendiente.historial,
      texto: pendiente.texto,
      creado: pendiente.creado,
      nonce: pendiente.nonce,
      declaracion: pendiente.declaracion,
      firma: pendiente.firma,
    });
    $('firma-pin').value = '';
    if (r.ok) {
      $('dialogo-firma').close();
      return mostrarResultado(r);
    }
    if (r.motivo === 'sin_alta') {
      await almacen.borrarPersona(persona.firmante);
      personas = await almacen.personas();
      $('dialogo-firma').close();
      if (!personas.length) return prepararAlta('');
      prepararParte();
      return mostrarError('parte-error', r.error);
    }
    if (r.motivo === 'declaracion') {
      pendiente.firma = null;
      await actualizarPersonas();
      const actual = personas.find((p) => p.firmante === persona.firmante);
      if (actual) $('firma-declaracion').textContent = actual.declaracion;
    }
    mostrarError('firma-error', r.error);
  } catch (e) {
    mostrarError('firma-error', e.message);
  } finally {
    libre(boton);
  }
}

function mostrarResultado(r) {
  $('resultado-numero').textContent = String(r.numero);
  $('resultado-repetido').hidden = !r.repetido;
  $('resultado-fecha').textContent = r.fecha;
  $('resultado-huella').textContent = formatearHuella(r.huella);
  $('resultado-huella').title = r.huella;
  $('resultado-resguardo').hidden = !r.resguardo;
  $('form-parte').reset();
  revisarTexto();
  pendiente = null;
  mostrar('resultado');
}

// --- Gestión de personas en el dispositivo ------------------------------

/** Pregunta al registro si cada alta sigue vigente; quita las retiradas. */
async function actualizarPersonas() {
  const quitadas = [];
  for (const p of personas) {
    try {
      const r = await llamar({ accion: 'estado', firmante: p.firmante, dispositivo: p.dispositivo });
      if (r.ok && r.activo === false) {
        await almacen.borrarPersona(p.firmante);
        quitadas.push(p.nombre);
      } else if (r.ok && r.activo && (r.nombre !== p.nombre || r.declaracion !== p.declaracion)) {
        await almacen.guardarPersona({ ...p, nombre: r.nombre, declaracion: r.declaracion });
      }
    } catch {
      // Sin conexión: se comprobará al firmar.
    }
  }
  personas = await almacen.personas();
  return quitadas;
}

function abrirQuitar() {
  const lista = $('quitar-lista');
  lista.replaceChildren(...personas.map((p) => {
    const item = document.createElement('li');
    const nombre = document.createElement('span');
    nombre.textContent = p.nombre;
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'boton-secundario';
    boton.textContent = 'Quitar';
    boton.addEventListener('click', async () => {
      if (!confirm('¿Quitar a ' + p.nombre + ' de este dispositivo?')) return;
      await almacen.borrarPersona(p.firmante);
      personas = await almacen.personas();
      $('dialogo-quitar').close();
      if (personas.length) prepararParte(p.nombre + ' ya no está en este dispositivo.');
      else prepararAlta('');
    });
    item.append(nombre, boton);
    return item;
  }));
  $('dialogo-quitar').showModal();
}

// --- Inicio -------------------------------------------------------------

async function iniciar() {
  $('form-alta').addEventListener('submit', enviarAlta);
  $('alta-cancelar').addEventListener('click', () => prepararParte());
  $('form-parte').addEventListener('submit', abrirFirma);
  $('form-parte').addEventListener('input', () => mostrarError('parte-error', ''));
  $('form-alta').addEventListener('input', () => mostrarError('alta-error', ''));
  $('parte-texto').addEventListener('input', revisarTexto);
  $('parte-anadir').addEventListener('click', () => prepararAlta(''));
  $('parte-quitar').addEventListener('click', abrirQuitar);
  $('form-firma').addEventListener('submit', firmarYEnviar);
  $('firma-volver').addEventListener('click', () => $('dialogo-firma').close());
  $('quitar-cerrar').addEventListener('click', () => $('dialogo-quitar').close());
  $('resultado-otro').addEventListener('click', () => prepararParte());

  if (!CONFIG.API_URL) return mostrar('config');
  if (!window.isSecureContext || !window.crypto?.subtle || !window.indexedDB) {
    $('config-motivo').textContent = 'Este navegador no permite firmar de forma segura. Actualízalo o usa otro (Chrome o Safari recientes).';
    return mostrar('config');
  }

  personas = await almacen.personas();
  const codigo = new URLSearchParams(location.hash.slice(1)).get('alta');
  if (codigo || !personas.length) prepararAlta(codigo);
  else prepararParte();

  const quitadas = await actualizarPersonas();
  if (quitadas.length && !$('pantalla-parte').hidden) {
    if (personas.length) prepararParte('Dirección retiró el alta de ' + quitadas.join(', ') + ' en este dispositivo.');
    else prepararAlta('');
  }
}

iniciar();
