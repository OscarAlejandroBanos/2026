// Simulador mínimo de Google Apps Script para ejecutar apps-script/Codigo.gs en
// Node. Imita lo que el código usa: hojas, propiedades, bloqueo, caché, correo,
// UrlFetch y las utilidades criptográficas (que en Apps Script devuelven bytes
// con signo, como Java).

import { createHash, createHmac, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const conSigno = (buffer) => Array.from(buffer, (b) => (b > 127 ? b - 256 : b));

class Rango {
  constructor(hoja, fila, columna, nFilas, nColumnas) {
    Object.assign(this, { hoja, fila, columna, nFilas, nColumnas });
  }

  getValues() {
    const valores = [];
    for (let i = 0; i < this.nFilas; i++) {
      const fila = [];
      for (let j = 0; j < this.nColumnas; j++) fila.push(this.hoja.valor(this.fila + i, this.columna + j));
      valores.push(fila);
    }
    return valores;
  }

  setValues(valores) {
    if (valores.length !== this.nFilas || valores.some((f) => f.length !== this.nColumnas)) {
      throw new Error(`Las dimensiones no coinciden con el rango (${this.nFilas}x${this.nColumnas}).`);
    }
    valores.forEach((f, i) => f.forEach((v, j) => this.hoja.poner(this.fila + i, this.columna + j, v)));
    return this;
  }

  setNumberFormat() { return this; }
  setFontWeight() { return this; }
  setWrap() { return this; }
  setDataValidation() { return this; }
  protect() { return { setDescription() { return this; }, setWarningOnly() { return this; } }; }
  getRow() { return this.fila; }

  createTextFinder(texto) {
    const rango = this;
    let distinguirMayusculas = false;
    return {
      matchCase(valor) { distinguirMayusculas = valor; return this; },
      findNext() {
        for (let i = 0; i < rango.nFilas; i++) {
          for (let j = 0; j < rango.nColumnas; j++) {
            const v = String(rango.hoja.valor(rango.fila + i, rango.columna + j));
            const hay = distinguirMayusculas ? v.includes(texto) : v.toLowerCase().includes(texto.toLowerCase());
            if (hay) return new Rango(rango.hoja, rango.fila + i, rango.columna + j, 1, 1);
          }
        }
        return null;
      },
    };
  }
}

class Hoja {
  constructor(nombre) {
    this.nombre = nombre;
    this.celdas = new Map();
    this.oculta = false;
  }

  getName() { return this.nombre; }
  valor(f, c) { return this.celdas.has(f + ':' + c) ? this.celdas.get(f + ':' + c) : ''; }
  poner(f, c, v) { this.celdas.set(f + ':' + c, v); }

  getLastRow() {
    let ultima = 0;
    for (const [clave, v] of this.celdas) if (v !== '') ultima = Math.max(ultima, Number(clave.split(':')[0]));
    return ultima;
  }

  getMaxRows() { return 1000; }

  getRange(fila, columna, nFilas = 1, nColumnas = 1) {
    if (fila < 1 || columna < 1 || nFilas < 1 || nColumnas < 1) {
      throw new Error(`Rango no válido: ${fila}, ${columna}, ${nFilas}, ${nColumnas}`);
    }
    return new Rango(this, fila, columna, nFilas, nColumnas);
  }

  setFrozenRows() {}
  setColumnWidth() {}
  hideColumns() {}
  hideSheet() { this.oculta = true; }

  /** Ayuda para las pruebas: fila n (1 = cabecera) como lista de valores. */
  fila(n, columnas = 18) { return this.getRange(n, 1, 1, columnas).getValues()[0]; }
}

class Libro {
  constructor(id) {
    this.id = id;
    this.hojas = new Map();
    this.propietario = 'direccion@clinica.example';
    this.editores = []; // las pruebas pueden "compartir" la hoja añadiendo correos aquí
    this.lectores = [];
  }

  getId() { return this.id; }
  getOwner() { return { getEmail: () => this.propietario }; }
  getEditors() { return [this.propietario, ...this.editores].map((correo) => ({ getEmail: () => correo })); }
  getViewers() { return this.lectores.map((correo) => ({ getEmail: () => correo })); }
  getSheetByName(nombre) { return this.hojas.get(nombre) || null; }
  insertSheet(nombre) {
    const hoja = new Hoja(nombre);
    this.hojas.set(nombre, hoja);
    return hoja;
  }
}

function formatearFecha(fecha, zona, patron) {
  const partes = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(fecha).map((p) => [p.type, p.value]));
  return patron.replace('dd', partes.day).replace('MM', partes.month).replace('yyyy', partes.year)
    .replace('HH', partes.hour).replace('mm', partes.minute).replace('ss', partes.second);
}

const EXPUESTOS = [
  'doPost', 'doGet', 'configurarCon_', 'crearAlta_', 'nuevoCodigoAlta_', 'desbloquearPin_', 'darDeBaja_',
  'verificarCadena_', 'exportarVerificacion_', 'anclaDiaria', 'instalarDisparadorAncla_', 'sha256Hex_', 'aplicarAjustes_',
  'HOJA_INCIDENTES', 'HOJA_FIRMANTES', 'HOJA_DISPOSITIVOS', 'HOJA_ALTAS', 'HOJA_ANCLAS', 'HOJA_BITACORA',
  'INC', 'FIR', 'DIS', 'ALT', 'ANC', 'BIT',
];

export function crearEntorno() {
  const libro = new Libro('libro-de-prueba');
  const propiedades = new Map();
  const cache = new Map();
  const correos = [];
  const peticiones = [];
  const disparadores = [];

  const globales = {
    SpreadsheetApp: {
      openById: (id) => {
        if (id !== libro.id) throw new Error('No existe la hoja ' + id);
        return libro;
      },
      getActiveSpreadsheet: () => libro,
      flush() {},
      newDataValidation: () => ({ requireValueInList() { return this; }, build() { return {}; } }),
      getUi: () => { throw new Error('No hay interfaz en las pruebas'); },
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (propiedades.has(k) ? propiedades.get(k) : null),
        setProperty: (k, v) => { propiedades.set(k, String(v)); },
        deleteProperty: (k) => { propiedades.delete(k); },
      }),
    },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => (cache.has(k) ? cache.get(k) : null),
        put: (k, v) => { cache.set(k, v); },
      }),
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      Charset: { UTF_8: 'UTF_8' },
      computeDigest: (_algoritmo, valor) => conSigno(createHash('sha256').update(String(valor), 'utf8').digest()),
      computeHmacSha256Signature: (valor, clave) => conSigno(createHmac('sha256', Buffer.from(clave, 'utf8')).update(valor, 'utf8').digest()),
      base64Encode: (bytes) => Buffer.from(bytes.map((b) => b & 255)).toString('base64'),
      getUuid: () => randomUUID(),
      formatDate: formatearFecha,
    },
    MailApp: { sendEmail: (mensaje) => { correos.push(mensaje); } },
    UrlFetchApp: {
      fetch: (url, opciones) => {
        peticiones.push({ url, opciones });
        return { getResponseCode: () => 200 };
      },
    },
    ContentService: {
      MimeType: { JSON: 'JSON' },
      createTextOutput: (texto) => ({ setMimeType() { return this; }, getContent: () => texto }),
    },
    Session: {
      getScriptTimeZone: () => 'Europe/Madrid',
      getEffectiveUser: () => ({ getEmail: () => 'direccion@clinica.example' }),
    },
    ScriptApp: {
      getProjectTriggers: () => disparadores,
      newTrigger: (funcion) => {
        const constructor = {
          timeBased: () => constructor,
          everyDays: () => constructor,
          atHour: () => constructor,
          create: () => {
            const disparador = { getHandlerFunction: () => funcion };
            disparadores.push(disparador);
            return disparador;
          },
        };
        return constructor;
      },
    },
    HtmlService: { createHtmlOutput: (html) => ({ html, setWidth() { return this; }, setHeight() { return this; } }) },
    console: { log() {}, error() {} },
  };

  const contexto = vm.createContext(globales);
  const codigo = readFileSync(new URL('../apps-script/Codigo.gs', import.meta.url), 'utf8');
  const gas = vm.runInContext(codigo + '\n;({' + EXPUESTOS.join(', ') + '})', contexto, { filename: 'Codigo.gs' });

  return {
    gas,
    libro,
    propiedades,
    cache,
    correos,
    peticiones,
    disparadores,
    hoja: (nombre) => libro.getSheetByName(nombre),
    /** Llama a doPost como lo haría la página: cuerpo JSON en texto plano. */
    post: (datos) => JSON.parse(gas.doPost({ postData: { contents: JSON.stringify(datos), type: 'text/plain' } }).getContent()),
  };
}
