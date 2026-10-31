// Prueba de punta a punta en Chromium: la página real (index.html, app/*.js)
// hablando con el backend real (Codigo.gs) a través del simulador.
// Uso: node tests/e2e.mjs [--capturas]   (las capturas van a documentacion/capturas)

import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { crearEntorno } from './simulador-gas.mjs';

// Playwright suele estar instalado de forma global: require lo encuentra, import no.
const { chromium } = createRequire(import.meta.url)('playwright');

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const API = 'https://script.google.com/macros/s/PRUEBA/exec';
const CAPTURAS = process.argv.includes('--capturas');
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json',
};

function servidorEstatico() {
  const servidor = createServer(async (peticion, respuesta) => {
    const ruta = decodeURIComponent(new URL(peticion.url, 'http://x').pathname);
    const archivo = normalize(join(RAIZ, ruta.endsWith('/') ? ruta + 'index.html' : ruta));
    if (!archivo.startsWith(RAIZ)) return respuesta.writeHead(403).end();
    try {
      const cuerpo = await readFile(archivo);
      respuesta.writeHead(200, { 'Content-Type': TIPOS[extname(archivo)] || 'application/octet-stream' }).end(cuerpo);
    } catch {
      respuesta.writeHead(404).end();
    }
  });
  return new Promise((resolver) => servidor.listen(0, '127.0.0.1', () => resolver(servidor)));
}

async function capturar(pagina, nombre) {
  if (!CAPTURAS) return;
  await mkdir(join(RAIZ, 'documentacion', 'capturas'), { recursive: true });
  await pagina.screenshot({ path: join(RAIZ, 'documentacion', 'capturas', nombre + '.png'), fullPage: true });
}

const visible = (pagina, selector) => pagina.locator(selector).waitFor({ state: 'visible', timeout: 5000 });

async function main() {
  const entorno = crearEntorno();
  entorno.gas.configurarCon_(entorno.libro, { AVISO_EMAILS: 'direccion@clinica.example' });

  const servidor = await servidorEstatico();
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const navegador = await chromium.launch();
  const contexto = await navegador.newContext({ viewport: { width: 412, height: 860 }, deviceScaleFactor: 2, locale: 'es-ES' });
  const errores = [];

  await contexto.route(`${base}/config.js`, (ruta) => ruta.fulfill({
    contentType: 'text/javascript', body: `export default { API_URL: '${API}' };`,
  }));
  await contexto.route(`${API}*`, async (ruta) => {
    const salida = entorno.gas.doPost({ postData: { contents: ruta.request().postData(), type: 'text/plain' } });
    await ruta.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: salida.getContent() });
  });

  const pagina = await contexto.newPage();
  pagina.on('pageerror', (e) => errores.push(e.message));
  pagina.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });

  // 1. Alta de Ana con el enlace directo.
  const ana = entorno.gas.crearAlta_(entorno.libro, 'Ana Pérez');
  await pagina.goto(`${base}/#alta=${ana.codigo}`);
  await visible(pagina, '#pantalla-alta');
  assert.equal(await pagina.inputValue('#alta-codigo'), ana.codigo.slice(0, 4) + '-' + ana.codigo.slice(4));
  assert.equal(await pagina.isVisible('#alta-cancelar'), false, 'sin nadie dado de alta no hay a dónde volver');
  await pagina.fill('#alta-pin', '482915');
  await pagina.fill('#alta-pin2', '482915');
  await pagina.fill('#alta-email', 'ana@correo.example');
  await capturar(pagina, '1-alta');
  await pagina.click('#alta-boton');
  await visible(pagina, '#pantalla-parte');
  assert.match(await pagina.textContent('#parte-mensaje'), /Listo, Ana Pérez/);
  console.log('✔ alta de Ana en la tablet');

  // 2. Alta de Luis en el mismo dispositivo (código escrito a mano).
  const luis = entorno.gas.crearAlta_(entorno.libro, 'Luis Gómez');
  await pagina.click('#parte-anadir');
  await visible(pagina, '#pantalla-alta');
  assert.equal(await pagina.isVisible('#alta-cancelar'), true);
  await pagina.fill('#alta-codigo', luis.codigo.toLowerCase());
  await pagina.fill('#alta-pin', '730264');
  await pagina.fill('#alta-pin2', '730264');
  await pagina.click('#alta-boton');
  await visible(pagina, '#parte-quien-varios');
  assert.deepEqual(await pagina.locator('#parte-persona option').allTextContents(), ['Elige tu nombre', 'Ana Pérez', 'Luis Gómez']);
  console.log('✔ alta de Luis en el mismo dispositivo');

  // 3. Parte: sin elegir nombre no deja; el aviso de datos personales salta.
  await pagina.fill('#parte-historial', 'h-1024');
  await pagina.fill('#parte-texto', 'El paciente protesta: llamadle al 612 345 678.');
  await visible(pagina, '#parte-aviso-datos');
  await pagina.click('#parte-boton');
  await visible(pagina, '#parte-error');
  await pagina.selectOption('#parte-persona', 'E1');
  assert.equal(await pagina.isHidden('#parte-error'), true, 'el error se borra al corregir');
  await pagina.fill('#parte-texto', 'El paciente protesta porque en recepción le dijeron otro precio para la corona. Se le explicó el presupuesto firmado y se le ofreció hablar con dirección.');
  assert.equal(await pagina.isHidden('#parte-aviso-datos'), true);
  await capturar(pagina, '2-parte');
  await pagina.click('#parte-boton');
  await visible(pagina, '#dialogo-firma');
  assert.equal(await pagina.textContent('#firma-declaracion'), 'Declaro que lo anterior es cierto y que lo registro yo, Ana Pérez.');
  assert.equal(await pagina.textContent('#firma-historial'), 'H-1024');
  console.log('✔ formulario y diálogo de firma');

  // 4. PIN equivocado y luego el bueno.
  await pagina.fill('#firma-pin', '000001');
  await pagina.click('#firma-boton');
  await visible(pagina, '#firma-error');
  assert.match(await pagina.textContent('#firma-error'), /Te quedan 4 intentos/);
  await pagina.fill('#firma-pin', '482915');
  await capturar(pagina, '3-firma');
  await pagina.click('#firma-boton');
  await visible(pagina, '#pantalla-resultado');
  assert.equal(await pagina.textContent('#resultado-numero'), '1');
  assert.equal(await pagina.isVisible('#resultado-resguardo'), true);
  await capturar(pagina, '4-resultado');
  console.log('✔ PIN incorrecto rechazado; parte nº 1 registrado');

  const fila = entorno.hoja('Incidentes').fila(2);
  assert.equal(fila[entorno.gas.INC.HISTORIAL], 'H-1024');
  assert.equal(fila[entorno.gas.INC.NOMBRE], 'Ana Pérez');
  assert.ok(entorno.correos.some((c) => c.to === 'ana@correo.example' && /nº 1/.test(c.subject)));

  // 5. Luis registra otro parte.
  await pagina.click('#resultado-otro');
  await pagina.selectOption('#parte-persona', 'E2');
  await pagina.fill('#parte-historial', '2231');
  await pagina.fill('#parte-texto', 'Se ha roto una corona colocada hace dos semanas y el paciente viene molesto. Se le da cita para mañana.');
  await pagina.click('#parte-boton');
  await pagina.fill('#firma-pin', '730264');
  await pagina.click('#firma-boton');
  await visible(pagina, '#pantalla-resultado');
  assert.equal(await pagina.textContent('#resultado-numero'), '2');
  assert.equal(await pagina.isVisible('#resultado-resguardo'), false, 'Luis no dio correo');
  console.log('✔ parte nº 2 de Luis');

  // 6. En el dispositivo no queda ningún parte ni dato de pacientes.
  const guardado = await pagina.evaluate(() => new Promise((resolver) => {
    const p = indexedDB.open('registro-incidentes');
    p.onsuccess = () => {
      const r = p.result.transaction('personas').objectStore('personas').getAll();
      r.onsuccess = () => resolver({ localStorage: localStorage.length, personas: r.result.map((x) => Object.keys(x).sort()) });
    };
  }));
  assert.equal(guardado.localStorage, 0);
  for (const claves of guardado.personas) {
    assert.deepEqual(claves, ['alta', 'claves', 'clave', 'declaracion', 'dispositivo', 'firmante', 'nombre', 'tipo'].sort());
  }
  const texto = JSON.stringify(await pagina.evaluate(() => document.body.innerText));
  assert.ok(!texto.includes('H-1024') && !texto.includes('corona'), 'el formulario queda vacío tras enviar');
  console.log('✔ el dispositivo solo guarda las altas y sus claves');

  // 7. Dirección retira el alta de Luis: el dispositivo lo quita al abrir.
  entorno.gas.darDeBaja_(entorno.libro, 'E2');
  await pagina.reload();
  await visible(pagina, '#parte-mensaje');
  assert.match(await pagina.textContent('#parte-mensaje'), /retiró el alta de Luis Gómez/);
  assert.equal(await pagina.isVisible('#parte-quien-uno'), true);
  console.log('✔ baja reflejada en el dispositivo');

  // 8. Verificador: todo correcto, y una firma falsificada se detecta.
  const exportacion = entorno.gas.exportarVerificacion_(entorno.libro);
  const verif = await contexto.newPage();
  verif.on('pageerror', (e) => errores.push(e.message));
  verif.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  await verif.goto(`${base}/verificar.html`);
  await verif.fill('#exportacion', JSON.stringify(exportacion));
  await verif.click('#verificar');
  await visible(verif, '#resultado');
  assert.match(await verif.textContent('#resumen'), /Todo correcto: 2 partes.*Todavía no hay anclas/);
  assert.match(await verif.textContent('#filas'), /E1 · Ana Pérez/);
  assert.equal(await verif.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, 'la página no se desborda a lo ancho');
  await capturar(verif, '5-verificador');
  const falsa = structuredClone(exportacion);
  falsa.partes[0].datos = falsa.partes[0].datos.replace('otro precio', 'el precio correcto');
  await verif.fill('#exportacion', JSON.stringify(falsa));
  await verif.click('#verificar');
  await verif.waitForFunction(() => /Hay problemas/.test(document.getElementById('resumen').textContent));
  console.log('✔ verificador: correcto y detecta un parte alterado');

  assert.deepEqual(errores, [], 'errores en la consola del navegador:\n' + errores.join('\n'));
  console.log('✔ sin errores en la consola (incluida la política de seguridad de contenidos)');

  await navegador.close();
  servidor.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
