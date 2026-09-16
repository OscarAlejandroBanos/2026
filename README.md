# Curso 26-27 · la web

La puerta del curso con sus materias, los calendarios de sesiones de Lengua
castellana (CAS) y de PAU +25 con sus páginas de ejercicios enlazadas sesión
por sesión, y los dos dossieres en PDF —el de CAS, además, partido en
cuadernos para imprimir solo lo que se está dando—.

**https://oscaralejandrobanos.github.io/2026/**

## Qué hay

| ruta | qué es |
|---|---|
| `index.html` | la puerta: las materias y sus unidades |
| `cas-trimestres.html` | el calendario de CAS, sesión por sesión |
| `cas/dia-NN.html` | los ejercicios de cada día de CAS, que se corrigen en la propia página |
| `pau-trimestres.html` | el calendario de PAU +25, con sus cuarenta y nueve sesiones |
| `pau/dia-NN.html` | los ejercicios de cada día de PAU +25 |
| `pau-materiales.css` | lo único que PAU no comparte con CAS: la marca en rombo y la tinta carmín |
| `pdf/` | los dossieres de alumnado y los diecisiete cuadernos sueltos de CAS |
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

Las páginas de CAS y de PAU +25 y los PDF no se editan aquí. Salen de sus dos
proyectos de material —`ACCESOS/Acceso Grado Superior` y `ACCESOS/Acceso
Selectividad25`— y los copia el `_analisis-libro/publicar-web.py` de cada uno.
Cada script escribe además su manifiesto (`cas-ejercicios-datos.js`,
`pau-ejercicios-datos.js`): de ahí saca su calendario qué sesión tiene página y
qué hay colgado para imprimir. El vínculo entre una sesión y su página es la
fecha, así que no hay ninguna lista que mantener a mano.

El de PAU +25 escribe también `pau-trimestres-datos.js`, con las cuarenta y
nueve sesiones leídas de `TEMPORALIZACION-PAU25-26-27.md`. Al mover una sesión
en la temporalización cambian solos el calendario, el rango de fechas de cada
cajón y el recuento de sesiones.

Después de pasar el script:

```bash
git add -A && git commit -m "publica los ejercicios del día N" && git push
```
