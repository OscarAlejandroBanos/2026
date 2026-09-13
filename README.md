# Curso 26-27 · la web

La puerta del curso con sus materias, el calendario de sesiones de Lengua
castellana (CAS) con las diecinueve páginas de ejercicios enlazadas sesión por
sesión, y el dossier en PDF —entero y partido en cuadernos para imprimir solo
lo que se está dando—.

**https://oscaralejandrobanos.github.io/2026/**

## Qué hay

| ruta | qué es |
|---|---|
| `index.html` | la puerta: las materias y sus unidades |
| `cas-trimestres.html` | el calendario de CAS, sesión por sesión |
| `cas/dia-NN.html` | los ejercicios de cada día, que se corrigen en la propia página |
| `pdf/` | el dossier de alumnado y los diecisiete cuadernos sueltos |
| `img/`, `audio/` | láminas, texturas y las pistas de la unidad 1 |
| `unidad-01.html` | la unidad 1 de Castellà 2 |

Es HTML estático. No hay servidor ni compilación: se abre `index.html` y
funciona.

## Qué no hay, y por qué

- **El ejemplar del profesorado.** Un sitio estático no puede reservar un
  archivo: la clave del portal es JavaScript y decide qué se pinta, no qué se
  sirve, así que cualquiera que tenga la URL descarga el PDF. El día que haga
  falta colgarlo, se cifra el propio PDF antes de subirlo.
- **Las herramientas de medida** (`_caja.js`, `_lam.js`, `_prueba-*`). Ninguna
  página las carga; se pegan a mano en la consola del navegador al medir.
- **Las copias de trabajo** (`index.antes-de*.html`, `*.bak-*`). Siguen en el
  disco de origen.

## Cómo se actualiza

Las páginas de CAS y los PDF no se editan aquí. Salen del proyecto de material y
los copia `_analisis-libro/publicar-web.py`, que además escribe
`cas-ejercicios-datos.js`: de ahí saca `cas-trimestres.html` qué sesión tiene
página y qué cuadernos hay colgados. El vínculo entre una sesión y su página es
la fecha, así que no hay ninguna lista que mantener a mano.

Después de pasar el script:

```bash
git add -A && git commit -m "publica los ejercicios del día N" && git push
```
