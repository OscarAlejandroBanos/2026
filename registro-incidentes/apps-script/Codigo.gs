/**
 * Registro de incidentes firmado: backend en Google Apps Script.
 *
 * Se pega en el editor de Apps Script de la hoja de cálculo de dirección
 * (Extensiones → Apps Script). Recibe los partes que firma el personal desde la
 * tablet de la clínica (o, si alguien lo elige voluntariamente, desde su móvil),
 * los añade a la hoja encadenando sus huellas y avisa a dirección sin incluir
 * ningún dato del paciente.
 *
 * Modelo de firma (ver documentacion/seguridad-y-limites.md):
 *  - Cada dispositivo genera, al dar de alta a una persona, un par de claves
 *    ECDSA P-256. La clave privada no sale nunca del dispositivo; aquí solo se
 *    guarda la pública. No se usa biometría en ningún paso.
 *  - Cada parte lleva la firma del dispositivo sobre los "datos firmados" y el
 *    PIN personal, que se comprueba aquí (hash con sal y pepper).
 *  - Cada fila guarda la huella de la anterior (cadena). Un ancla diaria envía
 *    por correo la última huella para dejar constancia fuera de la hoja.
 *
 * Licencia: Apache-2.0.
 */

const VERSION_API = 1;
const PROTOCOLO = 'registro-incidentes/v1';
const GENESIS = '0'.repeat(64);

const HOJA_INCIDENTES = 'Incidentes';
const HOJA_FIRMANTES = 'Firmantes';
const HOJA_DISPOSITIVOS = 'Dispositivos';
const HOJA_ALTAS = 'Altas';
const HOJA_ANCLAS = 'Anclas';

const CABECERAS = {
  [HOJA_INCIDENTES]: [
    'Nº', 'Fecha y hora', 'Recibido (UTC)', 'Firmante', 'Nombre', 'Nº historial', 'Qué pasó',
    'Declaración', 'Creado en el dispositivo', 'Clave', 'Datos firmados', 'Firma del dispositivo',
    'Huella del contenido', 'Huella anterior', 'Huella de la cadena',
    'Revisado (dirección)', 'Acción tomada (dirección)', 'Estado (dirección)',
  ],
  [HOJA_FIRMANTES]: ['ID', 'Nombre', 'Estado', 'Alta', 'Correo resguardos', 'Sal PIN', 'Hash PIN', 'Fallos', 'Bloqueado'],
  [HOJA_DISPOSITIVOS]: ['Firmante', 'Tipo', 'Desde', 'Hasta', 'Clave', 'Huella del dispositivo', 'Clave pública (JWK)'],
  [HOJA_ALTAS]: ['Código (huella)', 'Firmante', 'Creado', 'Caduca', 'Usado'],
  [HOJA_ANCLAS]: ['Fecha', 'Último Nº', 'Huella de la cadena', 'Enviado a'],
};

// Las columnas A..O las escribe solo este script y forman parte de la cadena.
// Las tres últimas (P..R) son para que dirección anote su revisión.
const COLUMNAS_SELLADAS = 15;

const INC = {
  NUMERO: 0, FECHA: 1, RECIBIDO: 2, FIRMANTE: 3, NOMBRE: 4, HISTORIAL: 5, TEXTO: 6,
  DECLARACION: 7, CREADO: 8, CLAVE: 9, DATOS: 10, FIRMA: 11, HUELLA_CONTENIDO: 12,
  HUELLA_ANTERIOR: 13, HUELLA_CADENA: 14,
};
const FIR = { ID: 0, NOMBRE: 1, ESTADO: 2, ALTA: 3, EMAIL: 4, SAL: 5, HASH_PIN: 6, FALLOS: 7, BLOQUEADO: 8 };
const DIS = { FIRMANTE: 0, TIPO: 1, DESDE: 2, HASTA: 3, CLAVE: 4, HUELLA: 5, JWK: 6 };
const ALT = { HUELLA: 0, FIRMANTE: 1, CREADO: 2, CADUCA: 3, USADO: 4 };
const ANC = { FECHA: 0, NUMERO: 1, HUELLA: 2, DESTINATARIOS: 3 };

const TIPOS_DISPOSITIVO = { tablet: 'Tablet de la clínica', personal: 'Móvil personal (voluntario)' };
const MAX_FALLOS_PIN = 5;
const HORAS_VALIDEZ_ALTA = 48;
const MAX_PETICIONES_POR_MINUTO = 60;
const LARGO_MIN_TEXTO = 5;
const LARGO_MAX_TEXTO = 3000;
const LARGO_MAX_PETICION = 20000;
const PATRON_HISTORIAL_POR_DEFECTO = '^[A-Z0-9-]{1,20}$';
const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I
const PINES_PROHIBIDOS = [
  '000000', '111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888',
  '999999', '123456', '654321', '012345', '543210', '123123', '121212', '112233', '696969',
];

/** Error cuyo mensaje se puede mostrar tal cual en el dispositivo. */
class ErrorPublico extends Error {
  constructor(mensaje, extra) {
    super(mensaje);
    this.name = 'ErrorPublico';
    this.extra = extra || {};
  }
}

// ---------------------------------------------------------------------------
// Aplicación web (la llama la página del personal)
// ---------------------------------------------------------------------------

function doGet() {
  return respuestaJson_({ ok: true, servicio: PROTOCOLO });
}

function doPost(e) {
  let respuesta;
  try {
    const peticion = leerPeticion_(e);
    limitarFrecuencia_();
    if (peticion.accion === 'alta') respuesta = registrarAlta_(peticion);
    else if (peticion.accion === 'parte') respuesta = registrarParte_(peticion);
    else if (peticion.accion === 'estado') respuesta = consultarEstado_(peticion);
    else throw new ErrorPublico('Acción desconocida.');
  } catch (err) {
    if (err instanceof ErrorPublico) {
      respuesta = Object.assign({ ok: false, error: err.message }, err.extra);
    } else {
      console.error((err && err.stack) || err);
      respuesta = { ok: false, error: 'Error interno. Prueba de nuevo en unos minutos.' };
    }
  }
  return respuestaJson_(respuesta);
}

function registrarAlta_(p) {
  const codigo = normalizarCodigo_(p.codigo);
  if (codigo.length !== 8) throw new ErrorPublico('El código de alta tiene 8 caracteres.');
  validarPinNuevo_(p.pin);
  const jwk = validarClavePublica_(p.clavePublica);
  const email = validarEmail_(p.email);
  const tipo = TIPOS_DISPOSITIVO[p.tipo];
  if (!tipo) throw new ErrorPublico('Indica si es la tablet de la clínica o tu móvil personal.');

  const libro = libro_();
  const r = conBloqueo_(() => {
    const ahora = new Date();
    const ahoraIso = ahora.toISOString();
    const altas = libro.getSheetByName(HOJA_ALTAS);
    const filasAltas = filasDatos_(altas);
    const huellaCodigo = sha256Hex_(codigo);
    const iAlta = filasAltas.findIndex((f) => f[ALT.HUELLA] === huellaCodigo);
    if (iAlta < 0) throw new ErrorPublico('Código de alta no válido.');
    const alta = filasAltas[iAlta];
    if (alta[ALT.USADO]) throw new ErrorPublico('Este código de alta ya se usó. Pide uno nuevo a dirección.');
    if (new Date(alta[ALT.CADUCA]) < ahora) throw new ErrorPublico('Este código de alta ha caducado. Pide uno nuevo a dirección.');

    const firmantes = libro.getSheetByName(HOJA_FIRMANTES);
    const filasF = filasDatos_(firmantes);
    const iF = filasF.findIndex((f) => f[FIR.ID] === alta[ALT.FIRMANTE]);
    if (iF < 0 || filasF[iF][FIR.ESTADO] === 'baja') throw new ErrorPublico('Código de alta no válido.');
    const firmante = filasF[iF];

    // Cada alta añade un dispositivo (la tablet, o el móvil de quien lo elija).
    // Las claves retiradas se conservan para poder verificar lo que firmaron.
    const dispositivo = aleatorioHex_(32);
    const huellaClave = huellaClave_(jwk);
    escribirFila_(libro.getSheetByName(HOJA_DISPOSITIVOS),
      [firmante[FIR.ID], tipo, ahoraIso, '', huellaClave, sha256Hex_(dispositivo), JSON.stringify(jwk)]);

    // El PIN es de la persona: el nuevo vale para todos sus dispositivos.
    const sal = aleatorioHex_(16);
    firmante[FIR.ESTADO] = 'activo';
    firmante[FIR.ALTA] = firmante[FIR.ALTA] || ahoraIso;
    if (email) firmante[FIR.EMAIL] = email;
    firmante[FIR.SAL] = sal;
    firmante[FIR.HASH_PIN] = hashPin_(sal, p.pin);
    firmante[FIR.FALLOS] = '0';
    firmante[FIR.BLOQUEADO] = '';
    escribirEnFila_(firmantes, iF + 2, firmante);

    alta[ALT.USADO] = ahoraIso;
    escribirEnFila_(altas, iAlta + 2, alta);
    return { id: firmante[FIR.ID], nombre: firmante[FIR.NOMBRE], dispositivo, huellaClave, conCorreo: Boolean(firmante[FIR.EMAIL]) };
  });

  avisarDireccion_('Alta de dispositivo: ' + r.nombre, r.nombre + ' ha dado de alta un dispositivo para firmar partes (' + tipo + ').');
  return {
    ok: true,
    firmante: r.id,
    nombre: r.nombre,
    dispositivo: r.dispositivo,
    clave: r.huellaClave,
    declaracion: textoDeclaracion_(r.nombre),
    resguardos: r.conCorreo,
  };
}

function registrarParte_(p) {
  const firmanteId = String(p.firmante || '');
  const dispositivo = String(p.dispositivo || '');
  if (!/^E\d{1,6}$/.test(firmanteId) || !/^[0-9a-f]{64}$/.test(dispositivo)) {
    throw new ErrorPublico('Este dispositivo no está dado de alta.', { motivo: 'sin_alta' });
  }
  const pin = String(p.pin || '');
  const historial = String(p.historial || '');
  if (!new RegExp(patronHistorial_()).test(historial)) throw new ErrorPublico('Nº de historial no válido.');
  const texto = String(p.texto || '');
  if (texto.trim().length < LARGO_MIN_TEXTO) throw new ErrorPublico('Cuenta un poco más qué ha pasado.');
  if (texto.length > LARGO_MAX_TEXTO) throw new ErrorPublico('El texto es demasiado largo (máximo ' + LARGO_MAX_TEXTO + ' caracteres).');
  const creado = String(p.creado || '');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(creado)) throw new ErrorPublico('Fecha del dispositivo no válida.');
  const nonce = String(p.nonce || '');
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(nonce)) throw new ErrorPublico('Petición no válida.');
  const declaracion = String(p.declaracion || '');
  const firma = String(p.firma || '');
  if (!/^[A-Za-z0-9_-]{80,100}$/.test(firma)) throw new ErrorPublico('Firma del dispositivo no válida.');

  const libro = libro_();
  const r = conBloqueo_(() => {
    const firmantes = libro.getSheetByName(HOJA_FIRMANTES);
    const filasF = filasDatos_(firmantes);
    const iF = filasF.findIndex((f) => f[FIR.ID] === firmanteId);
    const f = iF >= 0 ? filasF[iF] : null;
    const disp = f && f[FIR.ESTADO] === 'activo' ? dispositivoActivo_(libro, firmanteId, dispositivo) : null;
    if (!disp) {
      throw new ErrorPublico('Este dispositivo no está dado de alta para ti o fue retirado. Pide a dirección un código de alta nuevo.', { motivo: 'sin_alta' });
    }
    if (f[FIR.BLOQUEADO]) {
      throw new ErrorPublico('Tu PIN está bloqueado por demasiados intentos. Pide a dirección que lo desbloquee.', { motivo: 'bloqueado' });
    }
    if (!iguales_(f[FIR.HASH_PIN], hashPin_(f[FIR.SAL], pin))) {
      const fallos = Number(f[FIR.FALLOS] || 0) + 1;
      f[FIR.FALLOS] = String(fallos);
      if (fallos >= MAX_FALLOS_PIN) f[FIR.BLOQUEADO] = new Date().toISOString();
      escribirEnFila_(firmantes, iF + 2, f);
      return { fallo: fallos >= MAX_FALLOS_PIN ? 'bloqueado' : 'pin', restantes: MAX_FALLOS_PIN - fallos, nombre: f[FIR.NOMBRE] };
    }
    if (f[FIR.FALLOS] !== '0') {
      f[FIR.FALLOS] = '0';
      escribirEnFila_(firmantes, iF + 2, f);
    }

    const nombre = f[FIR.NOMBRE];
    if (declaracion !== textoDeclaracion_(nombre)) {
      throw new ErrorPublico('La declaración de firma ha cambiado. Recarga la página y vuelve a firmar.', { motivo: 'declaracion' });
    }

    const hoja = libro.getSheetByName(HOJA_INCIDENTES);
    const filaRepetida = filaConNonce_(hoja, nonce);
    if (filaRepetida) {
      // El mismo parte reenviado (p. ej. se cortó la conexión al recibir la respuesta).
      const previa = hoja.getRange(filaRepetida, 1, 1, COLUMNAS_SELLADAS).getValues()[0].map(String);
      if (previa[INC.FIRMANTE] !== firmanteId) throw new ErrorPublico('Petición no válida.');
      return { numero: Number(previa[INC.NUMERO]), fecha: previa[INC.FECHA], huellaCadena: previa[INC.HUELLA_CADENA], repetido: true };
    }

    const clave = disp[DIS.CLAVE];
    const datos = JSON.stringify([PROTOCOLO, firmanteId, historial, texto, creado, nonce, declaracion]);
    const huellaContenido = sha256Hex_(datos);
    const filaUltima = ultimaFilaIncidentes_(hoja);
    const ultima = filaUltima ? hoja.getRange(filaUltima, 1, 1, COLUMNAS_SELLADAS).getValues()[0].map(String) : null;
    const numero = ultima ? Number(ultima[INC.NUMERO]) + 1 : 1;
    const huellaAnterior = ultima ? ultima[INC.HUELLA_CADENA] : GENESIS;
    const ahora = new Date();
    const recibido = ahora.toISOString();
    const huellaCadena = huellaCadena_(String(numero), recibido, firmanteId, clave, huellaContenido, firma, huellaAnterior);
    const fecha = fechaLocal_(ahora);
    escribirEnFila_(hoja, (filaUltima || 1) + 1, [
      String(numero), fecha, recibido, firmanteId, seguroParaCelda_(nombre), seguroParaCelda_(historial),
      seguroParaCelda_(texto), seguroParaCelda_(declaracion), creado, clave, datos, firma,
      huellaContenido, huellaAnterior, huellaCadena,
    ]);
    return { numero, fecha, huellaCadena, nombre, email: f[FIR.EMAIL] };
  });

  if (r.fallo === 'bloqueado') {
    avisarDireccion_('PIN bloqueado: ' + r.nombre,
      'El PIN de ' + r.nombre + ' se ha bloqueado tras ' + MAX_FALLOS_PIN + ' intentos fallidos. ' +
      'Si ha sido un despiste suyo, desbloquéalo desde el menú «Registro de incidentes» de la hoja.');
    throw new ErrorPublico('Tu PIN se ha bloqueado por demasiados intentos. Pide a dirección que lo desbloquee.', { motivo: 'bloqueado' });
  }
  if (r.fallo === 'pin') {
    throw new ErrorPublico('PIN incorrecto. Te quedan ' + r.restantes + ' intentos.', { motivo: 'pin', restantes: r.restantes });
  }
  if (!r.repetido) {
    avisarDireccion_('Nuevo incidente registrado (nº ' + r.numero + ')',
      'Se ha registrado el incidente nº ' + r.numero + '. Ábrelo en la hoja de dirección para verlo.');
    if (r.email) enviarResguardo_(r.email, r.nombre, r.numero, r.fecha, r.huellaCadena);
  }
  return { ok: true, numero: r.numero, fecha: r.fecha, huella: r.huellaCadena, resguardo: Boolean(r.email), repetido: Boolean(r.repetido) };
}

function consultarEstado_(p) {
  const firmanteId = String(p.firmante || '');
  const dispositivo = String(p.dispositivo || '');
  if (!/^E\d{1,6}$/.test(firmanteId) || !/^[0-9a-f]{64}$/.test(dispositivo)) return { ok: true, activo: false };
  const libro = libro_();
  const f = filasDatos_(libro.getSheetByName(HOJA_FIRMANTES)).find((x) => x[FIR.ID] === firmanteId);
  const activo = Boolean(f && f[FIR.ESTADO] === 'activo' && dispositivoActivo_(libro, firmanteId, dispositivo));
  if (!activo) return { ok: true, activo: false };
  return { ok: true, activo: true, nombre: f[FIR.NOMBRE], declaracion: textoDeclaracion_(f[FIR.NOMBRE]), bloqueado: Boolean(f[FIR.BLOQUEADO]) };
}

// ---------------------------------------------------------------------------
// Menú de la hoja (lo usa dirección)
// ---------------------------------------------------------------------------

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Registro de incidentes')
    .addItem('Configurar (primera vez)', 'configurar')
    .addSeparator()
    .addItem('Dar de alta a un empleado', 'menuAltaEmpleado')
    .addItem('Nuevo código de alta (otro dispositivo, cambio de móvil u olvido del PIN)', 'menuNuevoCodigo')
    .addItem('Desbloquear un PIN', 'menuDesbloquearPin')
    .addItem('Dar de baja a un empleado', 'menuBajaEmpleado')
    .addSeparator()
    .addItem('Verificar la cadena de huellas', 'menuVerificarCadena')
    .addItem('Exportar para verificar las firmas', 'menuExportarVerificacion')
    .addItem('Enviar el ancla ahora', 'anclaDiaria')
    .addSeparator()
    .addItem('Cambiar avisos y ajustes', 'menuAjustes')
    .addToUi();
}

function configurar() {
  const ui = SpreadsheetApp.getUi();
  configurarCon_(SpreadsheetApp.getActiveSpreadsheet(), {});
  pedirAjustes_(ui);
  instalarDisparadorAncla_();
  ui.alert('Configuración lista',
    'Siguiente paso: arriba a la derecha, Implementar → Nueva implementación → Aplicación web.\n' +
    '• Ejecutar como: Yo\n' +
    '• Quién tiene acceso: Cualquier usuario\n\n' +
    'Copia la URL que termina en /exec y pégala en el archivo config.js de la página del personal ' +
    '(lo explica la guía de instalación).', ui.ButtonSet.OK);
}

function menuAjustes() {
  pedirAjustes_(SpreadsheetApp.getUi());
}

function menuAltaEmpleado() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Alta de un empleado',
    'Nombre y apellido. Aparecerá en su declaración de firma, así que escríbelo bien:', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const nombre = r.getResponseText().trim();
  if (!nombre || nombre.length > 60) {
    ui.alert('Escribe un nombre de entre 1 y 60 caracteres.');
    return;
  }
  const alta = crearAlta_(libroAdmin_(), nombre);
  mostrarCodigoAlta_(nombre, alta.codigo);
}

function menuNuevoCodigo() {
  const ui = SpreadsheetApp.getUi();
  const f = pedirFirmante_(ui, 'Nuevo código de alta',
    'Sirve para dar de alta otro dispositivo (por ejemplo, la tablet), para un móvil nuevo o si ha olvidado el PIN. ' +
    'Con el código elegirá un PIN nuevo, que valdrá en todos sus dispositivos.');
  if (!f) return;
  const retirar = ui.alert('¿Retirar sus dispositivos anteriores?',
    'Responde «Sí» si ha cambiado de móvil o lo ha perdido: el anterior dejará de poder firmar.\n' +
    'Responde «No» si solo añade otro dispositivo o ha olvidado el PIN.', ui.ButtonSet.YES_NO) === ui.Button.YES;
  const codigo = nuevoCodigoAlta_(libroAdmin_(), f[FIR.ID], retirar);
  mostrarCodigoAlta_(f[FIR.NOMBRE], codigo);
}

function menuDesbloquearPin() {
  const ui = SpreadsheetApp.getUi();
  const f = pedirFirmante_(ui, 'Desbloquear un PIN', 'Vuelve a permitir ' + MAX_FALLOS_PIN + ' intentos.');
  if (!f) return;
  desbloquearPin_(libroAdmin_(), f[FIR.ID]);
  ui.alert('PIN de ' + f[FIR.NOMBRE] + ' desbloqueado.');
}

function menuBajaEmpleado() {
  const ui = SpreadsheetApp.getUi();
  const f = pedirFirmante_(ui, 'Dar de baja a un empleado',
    'Sus dispositivos dejarán de poder firmar. Sus partes y sus claves públicas se conservan para poder verificarlos.');
  if (!f) return;
  if (ui.alert('¿Dar de baja a ' + f[FIR.NOMBRE] + '?', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  darDeBaja_(libroAdmin_(), f[FIR.ID]);
  ui.alert(f[FIR.NOMBRE] + ' ha quedado dado de baja.');
}

function menuVerificarCadena() {
  const ui = SpreadsheetApp.getUi();
  const r = verificarCadena_(libroAdmin_());
  ui.alert(r.ok ? 'Cadena íntegra' : 'Se han encontrado problemas', r.resumen, ui.ButtonSet.OK);
}

function menuExportarVerificacion() {
  const json = JSON.stringify(exportarVerificacion_(libroAdmin_()));
  const html =
    '<style>body{font:14px system-ui,sans-serif;margin:0}textarea{width:100%;height:220px;font:12px monospace}' +
    'button{font-size:14px;padding:8px 12px;margin:8px 8px 0 0}</style>' +
    '<p>Copia este texto y pégalo en la página <b>verificar.html</b>. Contiene los partes: no lo envíes a nadie. ' +
    'El verificador lo comprueba en tu navegador, sin enviarlo a ningún sitio.</p>' +
    '<textarea id="t" readonly>' + escaparHtml_(json) + '</textarea>' +
    '<button onclick="var t=document.getElementById(\'t\');t.select();document.execCommand(\'copy\')">Copiar</button>' +
    '<button onclick="google.script.host.close()">Cerrar</button>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(560).setHeight(380), 'Exportar para verificar las firmas');
}

/** La llama el disparador diario y el menú. Envía la última huella por correo. */
function anclaDiaria() {
  const libro = libroAdmin_();
  const props = PropertiesService.getScriptProperties();
  const r = conBloqueo_(() => {
    const hoja = libro.getSheetByName(HOJA_INCIDENTES);
    const filaUltima = ultimaFilaIncidentes_(hoja);
    if (!filaUltima) return null;
    const ultima = hoja.getRange(filaUltima, 1, 1, COLUMNAS_SELLADAS).getValues()[0].map(String);
    const anclas = libro.getSheetByName(HOJA_ANCLAS);
    const previas = filasDatos_(anclas);
    const anterior = previas[previas.length - 1];
    if (anterior && anterior[ANC.NUMERO] === ultima[INC.NUMERO] && anterior[ANC.HUELLA] === ultima[INC.HUELLA_CADENA]) return null;
    const destinatarios = [props.getProperty('AVISO_EMAILS'), props.getProperty('ANCLA_EMAILS')].filter(Boolean).join(',');
    const fecha = fechaLocal_(new Date());
    escribirFila_(anclas, [fecha, ultima[INC.NUMERO], ultima[INC.HUELLA_CADENA], destinatarios]);
    return { fecha, numero: ultima[INC.NUMERO], huella: ultima[INC.HUELLA_CADENA], destinatarios };
  });
  if (!r || !r.destinatarios) return;
  intentar_(() => MailApp.sendEmail({
    to: r.destinatarios,
    subject: 'Ancla del registro de incidentes: ' + r.fecha,
    name: 'Registro de incidentes',
    body:
      'Constancia de que el ' + r.fecha + ' el registro de incidentes tenía ' + r.numero + ' partes ' +
      'y de que la huella de la cadena del último era:\n\n' + r.huella + '\n\n' +
      'Si alguien modificara o borrara después un parte anterior, esta huella dejaría de cuadrar. ' +
      'Guarda este correo. No contiene datos de pacientes.',
  }));
}

// ---------------------------------------------------------------------------
// Operaciones de dirección (sin interfaz, para poder probarlas)
// ---------------------------------------------------------------------------

function configurarCon_(libro, ajustes) {
  prepararLibro_(libro);
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('PEPPER')) props.setProperty('PEPPER', aleatorioHex_(32));
  props.setProperty('SPREADSHEET_ID', libro.getId());
  Object.keys(ajustes || {}).forEach((k) => props.setProperty(k, String(ajustes[k])));
}

function prepararLibro_(libro) {
  Object.keys(CABECERAS).forEach((nombre) => {
    const hoja = libro.getSheetByName(nombre) || libro.insertSheet(nombre);
    const cab = CABECERAS[nombre];
    if (hoja.getLastRow() === 0) {
      hoja.getRange(1, 1, 1, cab.length).setValues([cab]).setFontWeight('bold');
      hoja.setFrozenRows(1);
    }
    hoja.getRange(1, 1, hoja.getMaxRows(), cab.length).setNumberFormat('@');
  });

  const inc = libro.getSheetByName(HOJA_INCIDENTES);
  inc.setColumnWidth(INC.TEXTO + 1, 420);
  inc.getRange(1, INC.TEXTO + 1, inc.getMaxRows(), 1).setWrap(true);
  // Columnas técnicas ocultas: siguen ahí para verificar, pero no estorban.
  [INC.RECIBIDO, INC.DECLARACION, INC.CREADO].forEach((c) => inc.hideColumns(c + 1));
  inc.hideColumns(INC.CLAVE + 1, COLUMNAS_SELLADAS - INC.CLAVE);
  inc.getRange(2, COLUMNAS_SELLADAS + 1, inc.getMaxRows() - 1, 1)
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Sí', 'No'], true).build());
  inc.getRange(2, COLUMNAS_SELLADAS + 3, inc.getMaxRows() - 1, 1)
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Abierto', 'En curso', 'Cerrado'], true).build());
  inc.getRange(1, 1, inc.getMaxRows(), COLUMNAS_SELLADAS).protect()
    .setDescription('Columnas selladas por el registro: no las edites').setWarningOnly(true);

  const fir = libro.getSheetByName(HOJA_FIRMANTES);
  fir.hideColumns(FIR.SAL + 1, 2);
  fir.getRange(1, 1, fir.getMaxRows(), CABECERAS[HOJA_FIRMANTES].length).protect()
    .setDescription('Lo gestiona el menú «Registro de incidentes»').setWarningOnly(true);
  const dis = libro.getSheetByName(HOJA_DISPOSITIVOS);
  dis.hideColumns(DIS.CLAVE + 1, 3);
  dis.getRange(1, 1, dis.getMaxRows(), CABECERAS[HOJA_DISPOSITIVOS].length).protect()
    .setDescription('Lo gestiona el menú «Registro de incidentes»').setWarningOnly(true);
  libro.getSheetByName(HOJA_ALTAS).hideSheet();
}

function crearAlta_(libro, nombre) {
  return conBloqueo_(() => {
    const hoja = libro.getSheetByName(HOJA_FIRMANTES);
    const max = filasDatos_(hoja).reduce((m, f) => Math.max(m, Number(String(f[FIR.ID]).slice(1)) || 0), 0);
    const id = 'E' + (max + 1);
    escribirFila_(hoja, [id, seguroParaCelda_(nombre), 'pendiente', '', '', '', '', '0', '']);
    return { id, codigo: crearCodigoAlta_(libro, id) };
  });
}

function nuevoCodigoAlta_(libro, id, retirarDispositivos) {
  return conBloqueo_(() => {
    if (retirarDispositivos) retirarDispositivos_(libro, id, new Date().toISOString());
    return crearCodigoAlta_(libro, id);
  });
}

function crearCodigoAlta_(libro, id) {
  const hoja = libro.getSheetByName(HOJA_ALTAS);
  const ahora = new Date();
  anularCodigos_(libro, id, ahora.toISOString()); // un solo código vivo por persona
  const codigo = codigoAlta_();
  const caduca = new Date(ahora.getTime() + HORAS_VALIDEZ_ALTA * 3600 * 1000);
  escribirFila_(hoja, [sha256Hex_(codigo), id, ahora.toISOString(), caduca.toISOString(), '']);
  return codigo;
}

function desbloquearPin_(libro, id) {
  modificarFirmante_(libro, id, (f) => {
    f[FIR.FALLOS] = '0';
    f[FIR.BLOQUEADO] = '';
  });
}

function darDeBaja_(libro, id) {
  const ahora = new Date().toISOString();
  modificarFirmante_(libro, id, (f) => {
    f[FIR.ESTADO] = 'baja';
    f[FIR.SAL] = '';
    f[FIR.HASH_PIN] = '';
  });
  conBloqueo_(() => {
    retirarDispositivos_(libro, id, ahora);
    anularCodigos_(libro, id, ahora);
  });
}

/**
 * Recalcula las huellas de todos los partes y las compara con las guardadas y
 * con las anclas enviadas por correo. No comprueba las firmas de los
 * dispositivos (Apps Script no sabe verificar ECDSA): eso lo hace verificar.html.
 */
function verificarCadena_(libro) {
  const filas = filasDatos_(libro.getSheetByName(HOJA_INCIDENTES)).filter((f) => f[INC.NUMERO] !== '');
  const problemas = [];
  const cadenaPorNumero = {};
  let anterior = GENESIS;
  filas.forEach((f, i) => {
    const n = f[INC.NUMERO];
    if (n !== String(i + 1)) problemas.push('Fila ' + (i + 2) + ': se esperaba el nº ' + (i + 1) + ' y aparece «' + n + '» (falta o sobra un parte).');
    if (sha256Hex_(f[INC.DATOS]) !== f[INC.HUELLA_CONTENIDO]) problemas.push('Parte nº ' + n + ': los datos firmados no coinciden con su huella (contenido modificado).');
    if (f[INC.HUELLA_ANTERIOR] !== anterior) problemas.push('Parte nº ' + n + ': no enlaza con el parte anterior (cadena rota).');
    const esperada = huellaCadena_(n, f[INC.RECIBIDO], f[INC.FIRMANTE], f[INC.CLAVE], f[INC.HUELLA_CONTENIDO], f[INC.FIRMA], f[INC.HUELLA_ANTERIOR]);
    if (esperada !== f[INC.HUELLA_CADENA]) problemas.push('Parte nº ' + n + ': la huella de la cadena no cuadra (ha cambiado algún dato sellado).');
    const datos = parsearDatos_(f[INC.DATOS]);
    if (!datos || datos[1] !== f[INC.FIRMANTE] ||
        !igualVisible_(f[INC.HISTORIAL], datos[2]) || !igualVisible_(f[INC.TEXTO], datos[3])) {
      problemas.push('Parte nº ' + n + ': las columnas visibles no coinciden con lo firmado (el original sigue en «Datos firmados»).');
    }
    anterior = f[INC.HUELLA_CADENA];
    cadenaPorNumero[n] = f[INC.HUELLA_CADENA];
  });
  const anclas = filasDatos_(libro.getSheetByName(HOJA_ANCLAS));
  anclas.forEach((a) => {
    if (cadenaPorNumero[a[ANC.NUMERO]] !== a[ANC.HUELLA]) {
      problemas.push('Ancla del ' + a[ANC.FECHA] + ': el parte nº ' + a[ANC.NUMERO] + ' ya no tiene la huella que se envió ese día.');
    }
  });
  const ok = problemas.length === 0;
  const resumen = ok
    ? filas.length + ' partes comprobados y ' + anclas.length + ' anclas coinciden. Nada se ha modificado.'
    : problemas.slice(0, 15).join('\n') + (problemas.length > 15 ? '\n… y ' + (problemas.length - 15) + ' más.' : '');
  return { ok, total: filas.length, anclas: anclas.length, problemas, resumen };
}

function exportarVerificacion_(libro) {
  const partes = filasDatos_(libro.getSheetByName(HOJA_INCIDENTES)).filter((f) => f[INC.NUMERO] !== '').map((f) => ({
    numero: f[INC.NUMERO], recibido: f[INC.RECIBIDO], firmante: f[INC.FIRMANTE], nombre: f[INC.NOMBRE].replace(/^'/, ''), clave: f[INC.CLAVE],
    datos: f[INC.DATOS], firma: f[INC.FIRMA], huellaContenido: f[INC.HUELLA_CONTENIDO],
    huellaAnterior: f[INC.HUELLA_ANTERIOR], huellaCadena: f[INC.HUELLA_CADENA],
  }));
  const claves = filasDatos_(libro.getSheetByName(HOJA_DISPOSITIVOS)).map((d) => ({
    firmante: d[DIS.FIRMANTE], tipo: d[DIS.TIPO], huella: d[DIS.CLAVE], jwk: JSON.parse(d[DIS.JWK]),
    desde: d[DIS.DESDE], hasta: d[DIS.HASTA],
  }));
  const anclas = filasDatos_(libro.getSheetByName(HOJA_ANCLAS)).map((a) => ({
    fecha: a[ANC.FECHA], numero: a[ANC.NUMERO], huella: a[ANC.HUELLA],
  }));
  return { protocolo: PROTOCOLO, exportado: new Date().toISOString(), partes, claves, anclas };
}

// ---------------------------------------------------------------------------
// Utilidades internas
// ---------------------------------------------------------------------------

function pedirAjustes_(ui) {
  const props = PropertiesService.getScriptProperties();
  const preguntas = [
    ['AVISO_EMAILS', 'Correos de dirección para los avisos, separados por comas:', Session.getEffectiveUser().getEmail()],
    ['CHAT_WEBHOOK', 'Webhook de Google Chat para los avisos al móvil (opcional):', ''],
    ['URL_PAGINA', 'Dirección de la página del personal (GitHub Pages), por ejemplo https://usuario.github.io/registro-incidentes/:', ''],
    ['ANCLA_EMAILS', 'Correos extra para el ancla diaria (opcional; por ejemplo, el delegado de protección de datos):', ''],
  ];
  preguntas.forEach(([clave, texto, porDefecto]) => {
    const actual = props.getProperty(clave) || porDefecto;
    const r = ui.prompt('Ajustes del registro',
      texto + '\n\nValor actual: ' + (actual ? (clave === 'CHAT_WEBHOOK' ? '(configurado)' : actual) : '(vacío)') +
      '\nDéjalo en blanco para no cambiarlo. Escribe un guion (-) para vaciarlo.', ui.ButtonSet.OK_CANCEL);
    const valor = r.getSelectedButton() === ui.Button.OK ? r.getResponseText().trim() : '';
    if (valor === '-') props.deleteProperty(clave);
    else if (valor) props.setProperty(clave, valor);
    else if (!props.getProperty(clave) && porDefecto) props.setProperty(clave, porDefecto);
  });
}

function pedirFirmante_(ui, titulo, explicacion) {
  const filas = filasDatos_(libroAdmin_().getSheetByName(HOJA_FIRMANTES)).filter((f) => f[FIR.ESTADO] !== 'baja');
  if (!filas.length) {
    ui.alert('Todavía no hay empleados dados de alta.');
    return null;
  }
  const lista = filas.map((f) => f[FIR.ID] + ' · ' + f[FIR.NOMBRE] + ' (' + f[FIR.ESTADO] + ')').join('\n');
  const r = ui.prompt(titulo, explicacion + '\n\nEscribe el ID (por ejemplo E2):\n' + lista, ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return null;
  const id = r.getResponseText().trim().toUpperCase();
  const f = filas.find((x) => x[FIR.ID] === id);
  if (!f) ui.alert('No hay ningún empleado activo con el ID ' + id + '.');
  return f || null;
}

function mostrarCodigoAlta_(nombre, codigo) {
  const url = PropertiesService.getScriptProperties().getProperty('URL_PAGINA') || '';
  const legible = codigo.slice(0, 4) + '-' + codigo.slice(4);
  const enlace = url ? url.replace(/#.*$/, '') + '#alta=' + codigo : '';
  const html =
    '<style>body{font:15px system-ui,sans-serif;margin:0;line-height:1.45}code{font-size:30px;letter-spacing:3px}' +
    'ol{padding-left:20px}.enlace{word-break:break-all;font-size:13px}</style>' +
    '<p>Código de alta para <b>' + escaparHtml_(nombre) + '</b>:</p>' +
    '<p style="text-align:center"><code>' + legible + '</code></p>' +
    '<ol><li>En la tablet de la clínica (o en su móvil, solo si lo prefiere), abre la página del personal' +
    (url ? ' (<span class="enlace">' + escaparHtml_(url) + '</span>)' : '') + '.</li>' +
    '<li>En iPhone o iPad: primero «Compartir → Añadir a pantalla de inicio» y abrirla desde el icono.</li>' +
    '<li>Que escriba este código, elija su PIN de 6 cifras (solo lo sabrá esa persona) y pulse «Dar de alta».</li></ol>' +
    '<p>Vale una sola vez y caduca en ' + HORAS_VALIDEZ_ALTA + ' horas.</p>' +
    (enlace ? '<p>En Android también vale este enlace directo:<br><span class="enlace">' + escaparHtml_(enlace) + '</span></p>' : '');
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(460).setHeight(460), 'Alta de ' + nombre);
}

function instalarDisparadorAncla_() {
  const existe = ScriptApp.getProjectTriggers().some((t) => t.getHandlerFunction() === 'anclaDiaria');
  if (!existe) ScriptApp.newTrigger('anclaDiaria').timeBased().everyDays(1).atHour(23).create();
}

function modificarFirmante_(libro, id, cambio) {
  conBloqueo_(() => {
    const hoja = libro.getSheetByName(HOJA_FIRMANTES);
    const filas = filasDatos_(hoja);
    const i = filas.findIndex((f) => f[FIR.ID] === id);
    if (i < 0) throw new Error('No existe el empleado ' + id);
    cambio(filas[i]);
    escribirEnFila_(hoja, i + 2, filas[i]);
  });
}

function dispositivoActivo_(libro, firmanteId, dispositivo) {
  const huella = sha256Hex_(dispositivo);
  return filasDatos_(libro.getSheetByName(HOJA_DISPOSITIVOS))
    .find((d) => d[DIS.FIRMANTE] === firmanteId && !d[DIS.HASTA] && iguales_(d[DIS.HUELLA], huella)) || null;
}

function retirarDispositivos_(libro, id, hasta) {
  const hoja = libro.getSheetByName(HOJA_DISPOSITIVOS);
  filasDatos_(hoja).forEach((d, i) => {
    if (d[DIS.FIRMANTE] === id && !d[DIS.HASTA]) {
      d[DIS.HASTA] = hasta;
      escribirEnFila_(hoja, i + 2, d);
    }
  });
}

function anularCodigos_(libro, id, cuando) {
  const hoja = libro.getSheetByName(HOJA_ALTAS);
  filasDatos_(hoja).forEach((f, i) => {
    if (f[ALT.FIRMANTE] === id && !f[ALT.USADO]) {
      f[ALT.USADO] = 'anulado ' + cuando;
      escribirEnFila_(hoja, i + 2, f);
    }
  });
}

function leerPeticion_(e) {
  const contenido = e && e.postData && e.postData.contents;
  if (!contenido) throw new ErrorPublico('Petición vacía.');
  if (contenido.length > LARGO_MAX_PETICION) throw new ErrorPublico('Petición demasiado grande.');
  let datos;
  try {
    datos = JSON.parse(contenido);
  } catch (_) {
    throw new ErrorPublico('Petición mal formada.');
  }
  if (!datos || typeof datos !== 'object' || datos.v !== VERSION_API) {
    throw new ErrorPublico('Esta versión de la página no es compatible. Recarga la página.');
  }
  return datos;
}

function limitarFrecuencia_() {
  const cache = CacheService.getScriptCache();
  const clave = 'frecuencia:' + Math.floor(Date.now() / 60000);
  const n = Number(cache.get(clave) || 0) + 1;
  cache.put(clave, String(n), 120);
  if (n > MAX_PETICIONES_POR_MINUTO) throw new ErrorPublico('Demasiadas peticiones. Espera un minuto.');
}

function respuestaJson_(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(ContentService.MimeType.JSON);
}

function libro_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new ErrorPublico('El registro todavía no está configurado.');
  return SpreadsheetApp.openById(id);
}

function libroAdmin_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function conBloqueo_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new ErrorPublico('El registro está ocupado. Prueba de nuevo en unos segundos.');
  try {
    const r = fn();
    SpreadsheetApp.flush();
    return r;
  } finally {
    lock.releaseLock();
  }
}

/** Filas de datos (sin cabecera) como texto. */
function filasDatos_(hoja) {
  const n = hoja.getLastRow() - 1;
  if (n < 1) return [];
  const columnas = CABECERAS[hoja.getName()].length;
  return hoja.getRange(2, 1, n, columnas).getValues()
    .map((f) => f.map((v) => (v instanceof Date ? v.toISOString() : String(v))));
}

/** Última fila con nº de parte (ignora filas donde dirección solo escribió notas). */
function ultimaFilaIncidentes_(hoja) {
  const n = hoja.getLastRow();
  if (n < 2) return 0;
  const numeros = hoja.getRange(2, INC.NUMERO + 1, n - 1, 1).getValues();
  for (let i = numeros.length - 1; i >= 0; i--) {
    if (String(numeros[i][0]) !== '') return i + 2;
  }
  return 0;
}

function filaConNonce_(hoja, nonce) {
  const n = hoja.getLastRow();
  if (n < 2) return 0;
  const celda = hoja.getRange(2, INC.DATOS + 1, n - 1, 1).createTextFinder('"' + nonce + '"').matchCase(true).findNext();
  return celda ? celda.getRow() : 0;
}

function escribirFila_(hoja, valores) {
  escribirEnFila_(hoja, hoja.getLastRow() + 1, valores);
}

function escribirEnFila_(hoja, fila, valores) {
  hoja.getRange(fila, 1, 1, valores.length).setNumberFormat('@').setValues([valores.map(String)]);
}

function huellaCadena_(numero, recibido, firmante, clave, huellaContenido, firma, huellaAnterior) {
  return sha256Hex_(JSON.stringify([PROTOCOLO + '/cadena', numero, recibido, firmante, clave, huellaContenido, firma, huellaAnterior]));
}

function huellaClave_(jwk) {
  return sha256Hex_(JSON.stringify(['EC', 'P-256', jwk.x, jwk.y]));
}

function textoDeclaracion_(nombre) {
  return 'Declaro que lo anterior es cierto y que lo registro yo, ' + nombre + '.';
}

function hashPin_(sal, pin) {
  const pepper = PropertiesService.getScriptProperties().getProperty('PEPPER');
  if (!pepper) throw new Error('Falta PEPPER: ejecuta «Configurar».');
  return Utilities.base64Encode(Utilities.computeHmacSha256Signature(sal + ':' + pin, pepper, Utilities.Charset.UTF_8));
}

function sha256Hex_(texto) {
  return bytesAHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(texto), Utilities.Charset.UTF_8));
}

function bytesAHex_(bytes) {
  return bytes.map((b) => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

function aleatorioHex_(nBytes) {
  let hex = '';
  while (hex.length < nBytes * 2) hex += sha256Hex_(Utilities.getUuid() + Utilities.getUuid() + Date.now());
  return hex.slice(0, nBytes * 2);
}

function codigoAlta_() {
  const hex = aleatorioHex_(8);
  let codigo = '';
  for (let i = 0; i < 8; i++) codigo += ALFABETO_CODIGO[parseInt(hex.substr(i * 2, 2), 16) % ALFABETO_CODIGO.length];
  return codigo;
}

function normalizarCodigo_(c) {
  return String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function validarPinNuevo_(pin) {
  if (!/^\d{6}$/.test(String(pin || ''))) throw new ErrorPublico('El PIN tiene que tener 6 cifras.');
  if (PINES_PROHIBIDOS.indexOf(pin) >= 0) throw new ErrorPublico('Ese PIN es demasiado fácil de adivinar. Elige otro.');
}

function validarClavePublica_(jwk) {
  const b64 = /^[A-Za-z0-9_-]{43}$/;
  if (!jwk || typeof jwk !== 'object' || jwk.kty !== 'EC' || jwk.crv !== 'P-256' || !b64.test(jwk.x) || !b64.test(jwk.y) || 'd' in jwk) {
    throw new ErrorPublico('La clave del dispositivo no es válida. Recarga la página y vuelve a intentarlo.');
  }
  return { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y };
}

function validarEmail_(email) {
  const e = String(email || '').trim().toLowerCase();
  if (!e) return '';
  if (e.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new ErrorPublico('El correo no parece válido.');
  return e;
}

function patronHistorial_() {
  return PropertiesService.getScriptProperties().getProperty('HISTORIAL_PATRON') || PATRON_HISTORIAL_POR_DEFECTO;
}

function parsearDatos_(datos) {
  try {
    const d = JSON.parse(datos);
    return Array.isArray(d) && d[0] === PROTOCOLO && d.length === 7 ? d : null;
  } catch (_) {
    return null;
  }
}

/** Evita que un texto que empieza por = + - @ se interprete como fórmula. */
function seguroParaCelda_(s) {
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function igualVisible_(visible, original) {
  return visible === original || visible === "'" + original;
}

function iguales_(a, b) {
  a = String(a);
  b = String(b);
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}

function fechaLocal_(fecha) {
  return Utilities.formatDate(fecha, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
}

function escaparHtml_(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function avisarDireccion_(asunto, texto) {
  const props = PropertiesService.getScriptProperties();
  const emails = props.getProperty('AVISO_EMAILS');
  const webhook = props.getProperty('CHAT_WEBHOOK');
  if (emails) {
    intentar_(() => MailApp.sendEmail({
      to: emails, subject: asunto, name: 'Registro de incidentes',
      body: texto + '\n\n(Este aviso no contiene datos de pacientes.)',
    }));
  }
  if (webhook) {
    intentar_(() => UrlFetchApp.fetch(webhook, {
      method: 'post', contentType: 'application/json; charset=UTF-8', muteHttpExceptions: true,
      payload: JSON.stringify({ text: '<users/all> ' + texto }),
    }));
  }
}

function enviarResguardo_(email, nombre, numero, fecha, huella) {
  intentar_(() => MailApp.sendEmail({
    to: email,
    subject: 'Resguardo: parte nº ' + numero + ' registrado',
    name: 'Registro de incidentes',
    body:
      'Hola, ' + nombre + ':\n\n' +
      'Has firmado y registrado el parte nº ' + numero + ' el ' + fecha + '.\n' +
      'Huella del registro: ' + huella + '\n\n' +
      'Guarda este correo: es tu constancia de qué registraste y cuándo. No contiene datos del paciente.\n' +
      'Si no has sido tú, avisa a dirección enseguida.',
  }));
}

function intentar_(fn) {
  try {
    fn();
  } catch (err) {
    console.error((err && err.stack) || err);
  }
}
