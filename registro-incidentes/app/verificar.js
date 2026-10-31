import { verificarExportacion } from './cripto.js';

const $ = (id) => document.getElementById(id);

function celda(texto, clase) {
  const td = document.createElement('td');
  td.textContent = texto;
  if (clase) td.className = clase;
  return td;
}

function marca(ok) {
  return celda(ok ? '✔' : '✘', ok ? 'ok' : 'mal');
}

async function verificar() {
  $('error').hidden = true;
  $('resultado').hidden = true;
  let exportacion;
  try {
    exportacion = JSON.parse($('exportacion').value.trim());
  } catch {
    $('error').textContent = 'El texto no es una exportación válida. Copia todo el contenido del cuadro de exportación.';
    $('error').hidden = false;
    return;
  }
  try {
    const r = await verificarExportacion(exportacion);
    const malos = r.partes.filter((p) => p.problemas.length);
    const anclas = r.anclas.length === 0 ? 'Todavía no hay anclas enviadas.'
      : r.anclas.length === 1 ? 'La única ancla coincide.' : `Las ${r.anclas.length} anclas coinciden.`;
    const bitacora = `La bitácora (${r.bitacora.total} eventos) está íntegra.`;
    $('resumen').textContent = r.ok
      ? `Todo correcto: ${r.partes.length} partes con firma válida, contenido intacto y cadena completa. ${bitacora} ${anclas}`
      : [
        malos.length ? `Hay problemas en ${malos.length} de ${r.partes.length} partes.` : '',
        ...r.bitacora.problemas,
        r.anclas.some((a) => !a.ok) ? 'Alguna ancla no coincide: algo se ha cambiado o borrado después de enviarla.' : '',
      ].filter(Boolean).join(' ');
    $('resumen').className = r.ok ? 'mensaje' : 'error';
    $('filas').replaceChildren(...r.partes.map((p) => {
      const tr = document.createElement('tr');
      tr.append(celda(p.numero), celda(p.nombre ? `${p.firmante} · ${p.nombre}` : p.firmante), celda(p.dispositivo),
        marca(p.firmaOk), marca(p.contenidoOk), marca(p.cadenaOk), celda(p.problemas.join(' ')));
      return tr;
    }));
    $('bloque-anclas').hidden = !r.anclas.length;
    $('anclas').replaceChildren(...r.anclas.map((a) => {
      const tr = document.createElement('tr');
      tr.append(celda(a.fecha), celda(a.numero), marca(a.ok));
      return tr;
    }));
    $('resultado').hidden = false;
  } catch (e) {
    $('error').textContent = e.message;
    $('error').hidden = false;
  }
}

$('archivo').addEventListener('change', async () => {
  const archivo = $('archivo').files[0];
  if (archivo) $('exportacion').value = await archivo.text();
});
$('verificar').addEventListener('click', verificar);
