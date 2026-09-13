# `web/pdf/` · los cuadernos para imprimir

Aquí se deja el PDF de cada unidad, y **nada más hay que hacer**: la ficha del
portal lo enseña sola.

## Cómo se cuelga

1. Se genera el PDF del cuaderno desde `CASTELLÀ 2/DOSSIER/UNIDAD-0X.md` — sin
   las líneas `↳ PCIC ·`, que son para el profesor, y sin las claves, que van
   en su archivo aparte.
2. Se guarda aquí con **este nombre exacto**: `unidad-01.pdf`, `unidad-02.pdf`…
   Dos dígitos, como los `.md` y como los `.html`.
3. Se pasa el generador de esa unidad:

   ```bash
   python _unidad.py 01
   ```

   `avance()` comprueba si el archivo existe; si está, escribe su ruta y su
   peso en el `AVANCE` de `index.html` y la fila «El cuaderno en PDF» pasa de
   «Pronto» a un enlace de descarga. Si no está, se queda como hueco declarado.

**No hay ninguna lista que mantener.** El único vínculo entre el archivo y la
página es el nombre, así que quitar el PDF es borrarlo y volver a pasar el
generador.

## Lo que todavía no está

- **Las soluciones.** Su fila sigue reservada: irán con las claves, y hay que
  decidir antes si se abren con el código corto o van sueltas. Ver
  `CASTELLÀ 2/DOSSIER/WEB-CONVERSION.md`, § 9.
