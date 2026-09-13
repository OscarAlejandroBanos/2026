# Las imágenes de la web

Los huecos ya están hechos y medidos. **La página se ve completa sin ninguna de
estas imágenes**: entran como mejora, no como parche.

## Cómo se mete una

1. Deja el archivo en esta carpeta con el nombre exacto de la tabla.
2. En `index.html`, busca `const IMG = {` (está al principio del `<script>`) y
   **quita el `//` de su línea**.

Mientras la línea siga comentada, la web no le pide nada al servidor.

---

## LA REGLA QUE MANDA SOBRE TODAS LAS DEMÁS

**Los tres itinerarios son distintos, no desiguales.**

Nada de materiales nobles frente a materiales pobres, ni de ornamento
creciente, ni de espacios que vayan de humilde a prestigioso. El alumnado de
Castellano 2 no está un escalón por debajo del de PAU: está en otro camino.
Mucha gente llega a este centro después de haber dejado los estudios, y una
página que los ordena por rango dice justo lo que no debe decir.

Es la misma razón por la que los tres colores llevan la **luminancia igualada**
(0,390 en oscuro, 0,131 en claro): ninguno pesa más que otro. Con las imágenes
hay que sostener eso mismo, o el color deja de servir de nada.

*La primera versión de estos prompts fallaba justo aquí — llaves de hierro,
peltre y plata, y aulas de noche frente a bibliotecas universitarias. Queda
escrito para no repetirlo.*

> **Y ya ha estado a punto de repetirse.** En `Modelos -diseño WEB/` hay hoy
> `Aula.png` (un aula de noche), `Taller.png` (un taller con mesas) y
> `Universitat.png` (una sala de lectura universitaria). Puestas como lámina de
> Castellano 2, CAS y PAU serían exactamente el ranking que esta regla prohíbe:
> de aula humilde a biblioteca de prestigio. **No se usan para eso**, y no se
> usarán.
>
> **Pero la regla prohíbe REPARTIRLAS, no usarlas** (etapa 19). Desde el 3 de
> septiembre de 2026 las tres están puestas, cosidas por fundido en una sola
> tira panorámica: `centro.webp`, detrás del pie. Así dejan de ser tres sitios
> y pasan a ser uno — el centro entero de noche, con sus aulas, su taller y su
> sala de lectura, vacío y esperando. Nadie es dueño de ninguna, así que no
> ordena a nadie. Y cae justo donde la página dice de qué centro habla.
>
> **Y desde el 4 de septiembre de 2026 van ADEMÁS repartidas, una por materia,
> detrás del nombre al entrar** — pedido de Óscar: *«a cada sección se le puede
> agregar su imagen concebida, en el título cuando se accede, como pasa con la
> portada»*. La tira compartida sigue en la principal, que es donde se ven las
> tres puertas a la vez.
>
> **El reparto va CRUZADO, y ahí es donde se cumple la regla.** El reparto
> obvio —aula para Castellano 2, taller para el CAS, biblioteca para PAU— es
> exactamente la escalera que esta regla prohíbe. Cruzado dice lo contrario, y
> dice además algo cierto: **la lámina es dónde se estudia, no a dónde se va.**
> Los tres grupos usan las tres salas del mismo centro.
>
> | itinerario | sala |
> |---|---|
> | Castellano 2 | la sala de lectura |
> | CAS | el aula |
> | PAU +25 | el taller |
>
> Si algún día hay que cambiarlo es una línea: la clave `lamina` de cada
> materia en `MATERIAS`, dentro de `index.html`.

---

## 1 · Estado

| archivo | clave | estado |
|---|---|---|
| `portada.webp` | `portada` | **puesta** — el cajetín de tipos, de `Fons2.png` |
| `pared.webp` | `pared` | **puesta** — la pared del taller. Etapa 21: sale del ritual (donde se veia 4 s por sesion) y pasa a ser LA CAPA DEL CHIBALETE de toda la pagina, de noche, a `--lam-mur: .24`. Sigue tambien detras del ritual |
| `centro.webp` | `centro` | **puesta** — el centro de noche, al pie. 1800×380, 27 KB. Ver §2 bis |
| `lamina-c2.webp` | `lamC2` | **puesta** — la sala de lectura. 1600×360, 20 KB. Ver §3 |
| `lamina-cas.webp` | `lamCas` | **puesta** — el aula. 1600×360, 9 KB. Ver §3 |
| `lamina-pau.webp` | `lamPau` | **puesta** — el taller. 1600×360, 28 KB. Ver §3 |
| `hierro.webp` | — | **puesta**, pero **no** por esta vía: va incrustada en el HTML (ver §4) |
| `tex-verjurado.webp` | `--tex-verjurado` | **puesta** — 384², 56 KB |
| `tex-motas.webp` | `--tex-motas` | **puesta** — 448², 14 KB |
| `tex-polvo.webp` | `--tex-polvo` | **puesta** — 448², 17 KB |
| `tex-foxing.webp` | `--tex-foxing` | **puesta** — 600×760, 47 KB |
| `tex-mesa.webp` | `--u-tex3` | **puesta y AHORA VISIBLE** — 820×547, 76 KB · ver §7 |
| `tex-acero.webp` | `--tex-acero` | **puesta** — 96², 0,6 KB · ver §6 |
| `tex-cuna.webp` | `--tex-cuna` | **puesta** — 128², 0,9 KB · ver §6 |

**Las siete texturas NO se cargan como archivo: van INCRUSTADAS en el HTML**
como `data:` URI, igual que `hierro.webp`. Los `.webp` de esta carpeta son la
fuente para regenerarlas, no lo que pide la página.

**Por qué.** Esta web se abre **con doble clic, sin servidor**. Un archivo
aparte es una dependencia que puede no llegar, y una `mask-image` que no llega
**no cae al valor anterior: deja la capa entera invisible**, sin dar ningún
error. La primera versión las cargaba con un `Image()` de prueba y un respaldo
dibujado; funcionaba servido por HTTP y no se veía abriendo el `index.html`
directamente. Incrustadas, se ven siempre y en todas partes.

**Y cada `data:` URI se declara UNA sola vez** en un token de `:root`
(`--u-tex1`…`--u-tex7`) y se usa por `var()` en los dos lados de cada regla
(con prefijo `-webkit-` y sin él). Escribiéndolo en las dos declaraciones, el
HTML crecía 344 KB en vez de 171: la mitad era la misma cadena repetida.

Coste total: el `index.html` pasa de 212 a **383 KB**, y a cambio no pide un
solo archivo para verse entero.

**Cómo se prepararon** (el script vive en el bloc de notas de la sesión):
paso alto para quitar la caída de luz del render, estirado por percentiles,
**sin costura por fundido y recorte** —la banda derecha se funde sobre la
izquierda y luego se recorta, así el borde izquierdo pasa a ser una columna
VECINA del derecho, y empalman por construcción y no por suerte— y la textura
metida en el **canal alfa** con el RGB en blanco, porque `mask-image` usa el
alfa: un mapa gris sobre negro tiene alfa 1 en todas partes y no enmascara
nada. Empalme medido en las cinco: por debajo de la variación entre columnas
vecinas, o sea invisible.

Los tres sellos de bocallave (`sello-c2`, `sello-cas`, `sello-pau`) **ya no
hacen falta como imagen**. Ver §4: los modelos de Meshy se usaron, pero por
dentro.

---

## 2 · El fondo de la portada — HECHO

Detrás del titular, **al 20 %**, desvanecido por arriba y por abajo.
Sale de `Modelos -diseño WEB/Fons2.png`, que es literalmente el prompt de abajo
resuelto: el cajetín visto desde arriba, con la retícula bien marcada.

```
Overhead flat-lay of an antique letterpress type case, wooden compartments
filled with lead metal type sorted in rows, worn wood and dull grey metal,
raking side light, deep shadows between the compartments, dark and
desaturated, strong grid structure, photographic, top-down view.
No legible letters, no text overlay, no watermark, no hands.
```

**Cómo se preparó, por si hay que rehacerla.** 1200×800, WebP q64, 86 KB. Se
desatura un 72 % hacia la luz de la lámpara (la madera venía muy marrón y
peleaba con el negro azulado de la página) y **se le pone techo de luz**:

> Lo que decide el peor contraste **no es la media de la imagen, sino su píxel
> más claro**. Se comprime la parte alta con una curva suave —no un recorte,
> que aplana la retícula y se carga justo lo que sirve— hasta un techo de 118
> de luminancia.

Medido con la lámina puesta: sobre ella sólo cae texto en `--tinta`, que da
**8,63:1** en el peor píxel y con el grano aplicado por delante. El micro-texto
en `--tinta-3` no la toca (valor de máscara < 0,02).

---

## 2 bis · El centro de noche — HECHO

Detrás del pie, **al 24 %**, apagándose por los lados y por arriba.
Sale de las tres salas que había sin usar (`Aula.png`, `Taller.png`,
`Universitat.png`), **cosidas en una sola tira** — ver la regla de arriba: van
juntas o no van.

**Cómo se preparó, por si hay que rehacerla.** 1800×380, WebP q62, 27 KB.
Mismo método que §2 y dos cosas propias:

1. **El techo de luz baja a 96** (el de la portada es 118). Aquí debajo cae
   texto en `--tinta-3`, que es el color más flojo de la casa; allí sólo cae
   `--tinta`.
2. **El cosido es por fundido y rampa, con un solape del 18 %.** Cada sala
   entra sobre la anterior con un peso que va de 0 a 1 a lo largo del solape,
   así que no hay un solo canto duro y las tres se leen como una sola sala
   larga. Medido: máximo de luminancia 0,100 y valor sRGB más claro 117.

Y una máscara, no dos: la caída por los lados y la caída por arriba se hacen
de una vez con una elíptica anclada abajo, porque **las capas de una misma
declaración `mask-image` se SUMAN, no se cortan** — poniendo una vertical y
una horizontal sale la unión de las dos, o sea casi nada enmascarado.

Medido con la lámina puesta: el texto del pie da **7,05:1 de noche y 6,88:1 a
plena luz**, y el enlace 9,82 / 8,33.

**Y se usa DOS veces con el mismo archivo** (etapa 19.11): detrás del pie y
como **subfondo de las tres puertas al posarse** — difuminada 3,5 px, a 0,30
de noche y a 0,16 a plena luz. Los dos pesos no son gusto: es una foto oscura,
así que sobre el taller de noche ACLARA el fondo (y el texto claro gana
contraste) y sobre el pliego a plena luz lo OSCURECE (y el texto oscuro lo
pierde). A 0,34 en claro el micro-texto caía a 3,90:1.

Y aquí está la razón de fondo de que sea UNA tira y no tres fotos: **las tres
puertas enseñan exactamente lo mismo**. Repartidas, la página diría que a
Castellano 2 le toca un aula y a PAU una biblioteca.

---

## 3 · Las tres láminas de cabecera — HECHAS (4 de septiembre de 2026)

Van detrás del nombre de la materia, dentro de la materia abierta, y aparecen
al entrar. Es el mismo gesto que la portada con el cajetín de tipos, una escala
más abajo — y por eso usan la misma pieza (`.lamina`), no una nueva.

| archivo | itinerario | clave | qué es |
|---|---|---|---|
| `lamina-c2.webp` | Castellano 2 | `lamC2` | la sala de lectura |
| `lamina-cas.webp` | CAS | `lamCas` | el aula |
| `lamina-pau.webp` | PAU +25 | `lamPau` | el taller |

**El reparto va cruzado a propósito. Ver la regla que manda, arriba.**

**No hizo falta generar nada**: salen de las tres salas que ya estaban en
`Modelos -diseño WEB/` (`Aula.png`, `Taller.png`, `Universitat.png`), las
mismas tres que forman `centro.webp`. Así la tira del pie y las tres láminas
son literalmente el mismo centro, visto entero abajo y por partes dentro.

*(Los tres prompts de «página impresa / pliego corregido / página anotada» que
había aquí antes se retiran: pedían tres macros de papel, y lo que Óscar pidió
—y lo que la página necesitaba— era el sitio, no el papel. Quedan escritos en
el historial de git por si algún día se quiere otra cosa.)*

### Cómo se prepararon, por si hay que rehacerlas

Mismo método que §2 y §2 bis. El script está en el bloc de notas de la sesión.

1. **Recorte en banda panorámica**: 1600×360 (4,44:1), sacada de la franja que
   aporta ESTRUCTURA, que es lo único que sobrevive al 26 % — la pizarra y las
   filas de mesas (y=270), el tablero de herramientas y los bancos (y=300), las
   lámparas y las mesas largas (y=380). La sala de lectura se corta **baja a
   propósito**: sus arcos monumentales eran justo lo que hacía que pareciera
   «la buena».
2. **Desaturado del 72 % hacia la luz de la lámpara**, con la luminancia
   intacta (se mezcla contra el gris de la misma luminancia, no contra gris
   medio).
3. **Techo de luz por curva asintótica, no por recorte** — el recorte aplana la
   estructura, que es lo único que se lee a este peso.
4. WebP q62. Pesan 9, 20 y 28 KB.

**El techo es 84, y no 96 como la tira del pie ni 118 como la portada.** Salió
midiendo, no estimando: con techo 96 el micro-texto de Castellano 2 caía a
**4,31:1 a 390** y a **4,38:1 a 760**, porque en pantalla estrecha `cover` deja
de recortar por arriba y por abajo y pasa a recortar por los lados — se ve una
franja central AMPLIADA, y en ella los píxeles más claros (ventanas, lámparas)
caen justo debajo del micro. Con techo 84 el peor de todo el rango es **4,61**.

*Lo que decide el peor contraste no es la media de la imagen sino su píxel más
claro, y en una caja que cambia de proporción con el ancho, cuál es ese píxel
depende del ancho.*

### Y a plena luz van IMPRESAS, no a contraluz

Las cuatro fotos de la casa son de un sitio oscuro. Sobre el taller de noche
eso funciona: **aclaran** el fondo y el texto claro gana. Sobre el pliego lo
**oscurecen**, y no sólo cuesta contraste — se lee como una mancha, porque una
foto oscura sobre papel crema no es una lámina, es una sombra.

La salida no es bajarles el peso (a plena luz la de materia tenía que quedarse
en 0,11, o sea en nada). Es que a plena luz **la lámina esté impresa en el
pliego**: el tono entero sube y se comprime, como una media tinta muy abierta.
Va en un token, `--lam-tono`, y son dos funciones de CSS sobre el mismo
archivo:

```
de noche      --lam-tono: brightness(1)                  (no hace nada)
a plena luz   --lam-tono: contrast(.24) brightness(1.9)  (la mete en 184..231)
```

Sobre un papel de 246, un mínimo de 184 ya no puede hundir a nadie a los pesos
de la página. Por eso **a plena luz las láminas van a MÁS peso que de noche**,
que es justo al revés de lo que hacían antes:

| | de noche | a plena luz |
|---|---|---|
| portada | 0,20 | **0,62** |
| cabecera de materia | 0,26 (0,22 por debajo de 1000 px) | **0,46** |
| tira del pie | 0,50 | **0,55** |

**Y desde el 5 de septiembre de 2026 el TONO tambien va por sitio**, no solo el
peso. El mapa unico de la casa metia las tres fotos en 184..255 sobre un papel
de 246 — setenta y un niveles de recorrido para una fotografia entera— y a ese
aplanado no le queda estructura que ensenar. Lo que decide cuanto se puede
abrir cada una **es que texto le cae encima**:

| | tono a plena luz | quien manda debajo |
|---|---|---|
| portada | `contrast(.46) brightness(1.48)` · 102..255 | solo titular y epigrafe, en `--tinta` |
| cabecera de materia | `contrast(.28) brightness(1.82)` · 167..255 | el nombre de la materia (excepcion de 20.7) |
| tira del pie | `contrast(.32) brightness(1.74)` · 151..255 | el texto del pie, en `--tinta-3` |

Para poder abrirlas hubo que subir dos textos un escalon: la **firma del
epigrafe** a `--tinta` (caia a 3,04:1 sobre el nucleo de la lamina de portada)
y el **micro de la cabecera** a `--tinta-2`. Ver la etapa 22.12 de la
bitacora.

Es la misma idea de la etapa 7 —*a plena luz no son las mismas capas con otro
valor, son otras capas*— resuelta con un archivo en vez de con dos.

### Y la de materia lleva desenfoque, pero sólo de noche

`--lam-borron`: `blur(2px)` de noche, `blur(0px)` a plena luz. De noche la foto
conserva todo su contraste y encima cae el nombre de la materia en didona a
67 px: sin difuminar, se come los remates. A plena luz el mapa de tono ya ha
dejado la lámina en 47 niveles de recorrido, y ahí el desenfoque sólo quita
estructura — probado en pantalla: se leía como un rectángulo gris.

### Medido al cerrar

A **390, 760, 1010, 1280 y 1440**, en los dos temas, en las tres materias:
**ningún texto por debajo de 4,5:1**. El peor de todo el barrido es el
micro-texto (`--tinta-3`) a **4,61:1**.

La única excepción, y va dicha porque es una excepción de verdad: el **nombre
de la materia a plena luz** da **3,76 – 4,18:1**. Es texto de display de 67 px,
o sea texto grande, y ahí el mínimo son 3:1. Y su punto de partida ya era
**4,41:1 sin ninguna lámina** — la tinta del itinerario sobre el papel nunca ha
llegado a 4,5 en este tema. Si algún día se quiere que llegue, lo que hay que
tocar es `--i-1/2/3` del tema claro, no la lámina.

---

## 4 · Los bocallaves de Meshy: usados, pero por dentro

Los tres renders (`Meshy_AI_Escutcheon Round / Hexagon / Diamond Keyhole`) y
sus tres GLB **sí se han usado**, y siguen haciendo falta como fuente. Lo que
no se usa es la imagen puesta tal cual en la página, y por dos razones:

1. **De un modelo 3D lo que vale aquí es su mapa de color y sus proporciones**,
   no su render. Un render fotográfico de 4096² pegado al lado de una página
   dibujada a filete y trazo se lee como una foto pegada, no como una pieza de
   la casa.
2. **Un dibujo se puede girar sobre un pivote; una foto no.** El escudo tiene
   que tener un hueco de verdad por el que se meta la llave y sobre el que la
   llave gire. Eso pide geometría, no píxeles.

Lo que entró en la web:

- **El martilleado**, sacado del `base_color` del GLB, pasado a luminancia,
  quitada la caída de luz del render y cosido sin costura. **128×128, 5,4 KB**,
  incrustado en el HTML como `data:` URI dentro de un `<pattern>` de SVG.
  *Va incrustado y no como archivo porque la cerradura es interfaz: si falla la
  red, la lámina de la portada puede no estar, pero la cerradura tiene que
  verse igual.*
- **Las proporciones**, medidas con máscara alfa sobre los tres renders: los
  tres dan **0,294** exacto (mismo encuadre, que era la condición de esta
  ficha), el hueco ocupa el **23,2 %** del ancho y el **22,3 %** del alto, y su
  cabeza cae en el **46,8 / 51,0** de la chapa.
- **Las tres geometrías del hueco: círculo, hexágono y rombo**, que son las de
  los tres modelos. El cuadro que había antes se retiró porque un cuadro y un
  rombo son la misma figura girada 45°: dos de las tres «formas distintas» eran
  la misma forma.

`hierro.webp` queda también en esta carpeta por si hace falta rehacerlo, pero
la página no lo pide: lo lleva dentro.

**Y desde la etapa 19 no queda ningún modelo sin usar.** De los dos que sólo
habían dado su materia se trajo también su GEOMETRÍA, que es lo que faltaba:

- **La cuña de rama** (`Meshy_AI__0903111444_texture.glb`) → el botón «Abrir»,
  que se llama LA CUÑA desde la etapa 6 y no lo parecía. Medido sobre la malla:
  proporción **1 : 0,391**, **13 dientes** en el largo, paso **0,199 del alto**
  y fondo **0,192 del alto**. La cremallera va en `mask-image`, así que la
  silueta del botón ACABA en dientes; el martilleado sigue fuera, que eso ya se
  midió en la 14.4 y se come la letra.
- **El componedor** (`Meshy_AI__0903110402_texture.glb`) → **la rodilla** de la
  regla, la placa que cierra la medida por el canto derecho. Y una
  comprobación que salió sola: la pieza mide **8,33 : 1** de largo a alto y la
  regla de la página medía ya **8,14 : 1**. El tornillo de palomilla no se
  dibuja: cae donde va la cuentahílos.

**Si algún día hay que regenerar los modelos**, los prompts que salieron bien
son estos tres, idénticos palabra por palabra salvo la forma del hueco — que es
lo que garantiza que ninguno salga «mejor»:

```
An antique iron keyhole escutcheon plate, hand-forged wrought iron, matte dark
grey metal with a subtle hammered texture, tall rounded rectangular plate with
one screw at the top and one at the bottom, a ROUND / HEXAGONAL / DIAMOND-SHAPED
keyhole opening with a narrow slot below it, single isolated object seen
straight on, neutral soft studio lighting.
No gold, no brass, no silver, no color tint, no ornament, no text, no key.
```

*El `no gold` va en los tres porque Meshy tiende a dorarlo todo, y una cerradura
dorada chocaría con el carmín de PAU.*

---

## 5 · LAS PÁTINAS · pedidas, entregadas y medidas

> **Estado, 3 de septiembre de 2026: las cinco texturas y dos de las tres
> piezas de Meshy están puestas.** Falta **el tipo de plomo suelto** (§5.7).
>
> **Y los dos renders de Meshy llegaron sin alfa**, con el fondo del estudio
> dentro. No hizo falta recortarlos —de un modelo aquí sólo se usa un parche
> de superficie, ver §4— pero para la próxima: el `_nobg` de los bocallaves
> era lo correcto. Medido: el componedor traía fondo plano (gris 151,
> desviación 4,7 · recortable); la cuña, fondo con degradado y sombra
> proyectada (desviación 34,8 · no recortable de un tirón).
>
> **La cuña de la rama está puesta pero NO en el botón «Abrir».** Se probó
> ahí, que era su sitio natural, y la banda de los glifos se hundió de
> 4,83:1 a **1,12:1** a plena luz. Ver la bitácora, etapa 14.4. El
> martilleado se fue a los tipos de plomo del componedor, que son metal sin
> ninguna letra encima.

### Lo que se pidió (queda por si hay que rehacer alguna)

Desde la etapa 13 la página tiene seis pátinas —motas de pasta, polvo en el haz,
cercos de tinta en la mesa, foxing del papel, el repinte del titular y los
arañazos del hierro— y **las seis están dibujadas a mano con ruido procedural y
degradados**. Funcionan y están medidas, pero un `feTurbulence` es siempre la
misma mancha estadística: no tiene la irregularidad de una superficie de verdad.

Aquí es donde una textura fotográfica gana de calle a un dibujo, justo al revés
de lo que pasaba con los bocallaves (§4): **una pátina no hay que girarla sobre
un pivote, así que no necesita ser geometría.**

### Cómo mandarlas

Todas **sin costura** (*seamless / tileable*) y **en gris**, salvo donde se diga.
El color se lo pone la página con un token: entran de máscara, no de imagen —
es la regla del chibalete. Si vienen coloreadas, el tema claro y el oscuro no
pueden usar la misma.

| archivo | qué sustituye | formato |
|---|---|---|
| `tex-verjurado.webp` | los corondeles y pontuseles procedurales | 1024², gris, sin costura |
| `tex-motas.webp` | las motas de pasta (`feTurbulence`) | 512², gris sobre negro, sin costura |
| `tex-foxing.webp` | los cinco degradados radiales del foxing | 1400×1800, gris sobre negro, **sin costura sólo en vertical** |
| `tex-polvo.webp` | el polvo y los arañazos del aire | 1024², gris sobre negro, sin costura |
| `tex-mesa.webp` | los tres cercos de tinta | 1200×900, gris sobre negro, **sin repetir** |

**1 · El papel de tina** — `tex-verjurado.webp`
```
Seamless tileable macro texture of handmade laid paper, chain lines and laid
lines clearly visible, raking side light from the left, cotton fibre grain,
flat even exposure, greyscale, no vignette, no colour cast, no objects.
```

**2 · Las motas de la pasta** — `tex-motas.webp`
```
Seamless tileable greyscale map of sparse paper inclusions: tiny dark specks of
unbleached fibre and pulp knots scattered on pure black, irregular sizes,
roughly four percent coverage, no clusters, no grid, no gradient.
```

**3 · El foxing** — `tex-foxing.webp`
```
Greyscale stain map of foxing on old paper: soft irregular rust blooms
concentrated near the edges of the sheet, centre almost clean, ragged organic
edges, varied sizes, on pure black, seamless from top to bottom.
```

**4 · El polvo del taller** — `tex-polvo.webp`
```
Seamless tileable dust and scratches overlay: fine suspended dust motes and a
few long thin hairline scratches, white on pure black, high contrast, sparse,
no lens flare, no bokeh, no vignette.
```

**5 · La mesa de componer** — `tex-mesa.webp`
```
Greyscale wear map of a letterpress composing table: dried ink rings left by
jars, a few smudges and thumb marks, worn wood scuffs, white on pure black,
sparse and irregular, no text, no objects, not tileable.
```

### Y tres piezas de Meshy, por el mismo motivo que los bocallaves

De un modelo aquí sólo se usan **su mapa de color y sus proporciones** (§4).
Las tres piezas que hoy están dibujadas sin material propio son estas:

**6 · El componedor** — la regla de metal donde caen los tipos de la contraseña.
```
An antique typesetter's composing stick, brass and steel, adjustable metal
rule with a sliding knee and a thumbscrew, worn satin metal with fine
scratches, single isolated object seen straight on, neutral soft studio
lighting.
No gold, no brass shine, no colour tint, no ornament, no text, no type.
```

**7 · Un tipo de plomo suelto** — el cuerpo del tipo, que es lo que se ve en el
componedor. Se pide **de canto y con la muesca**, que es lo que la página dibuja.
```
A single piece of antique lead letterpress type seen from the side, plain
rectangular metal body with the nick groove across the front face, dull grey
oxidised lead, worn edges, single isolated object, neutral soft studio
lighting.
No visible letterform, no printed character, no colour tint, no text.
```

**8 · La cuña de la rama** — el botón «Abrir» ya se llama LA CUÑA en el código.
```
An antique letterpress quoin, wedge-shaped iron locking block with a toothed
rack, matte dark grey wrought iron with a hammered surface, single isolated
object seen straight on, neutral soft studio lighting.
No gold, no brass, no silver, no colour tint, no ornament, no text.
```

### Lo que NO hace falta pedir

- **Nada por itinerario.** Sigue mandando la regla de arriba: tres formas de
  trabajar sobre un texto, ninguna por encima de otra. Una textura de pátina es
  de la casa entera, no de un grupo — y así no puede ordenarlos por rango.
- **Nada con letra dentro.** Es la regla de Emma: los generadores escriben mal
  las tildes y esta es una web de acentuación.
- **Ningún render de la cerradura.** Ya está resuelta por geometría, y tiene que
  poder girar sobre un pivote.

**Cuando las tengas, mándalas y las mido con el método de §2**: techo de luz,
cobertura real rasterizada pixel a pixel, y contraste comprobado del texto que
de verdad les cae encima. Una textura que no se puede medir no entra.


---

## 5 bis · DÓNDE VIVE CADA PÁTINA (y en qué token)

Esta tabla no estaba y hacía falta: el 5 de septiembre de 2026 Óscar preguntó
**«no encuentro dónde se aplica lo de la mesa de componer o algunas de esas
texturas»**, y la respuesta no estaba escrita en ninguna parte. Ahora sí.

Los nombres de archivo (`tex-*.webp`) **no aparecen en `index.html`**: las
texturas van incrustadas como `data:` URI en un token `--u-texN`, y ése es el
nombre por el que hay que buscarlas.

| archivo | token | regla que la usa | de noche | a plena luz |
|---|---|---|---|---|
| `tex-motas.webp` | `--u-tex1` | `.capa--motas` | 0,32 | 0,24 |
| `tex-polvo.webp` | `--u-tex2` | `.capa--polvo > div` | 0,42 | **0** — sin haz no hay polvo |
| `tex-mesa.webp` | `--u-tex3` | `.capa--mesa > div` | 1 × α 0,18 | 0,26 × α 0,30 |
| `tex-foxing.webp` | `--u-tex4` | `.patina--foxing` | **0** — el óxido no se ve | 0,16 |
| `tex-acero.webp` | `--u-tex5` | `.cajetin`, componedor, rodillo… | — | — |
| `tex-cuna.webp` | `--u-tex6` | tipos de plomo, bloque de unidad | — | — |
| `tex-verjurado.webp` | `--u-tex7` | `.capa--chibalete > .chib` | **no se usa** | 0,085 |

---

## 7 · La mesa de componer estaba puesta y no se veía (5 de septiembre de 2026)

Óscar la buscó y no la encontró. **Tenía razón: no estaba.** Estaba declarada,
medida y documentada, y aun así no pintaba nada visible en ninguno de los dos
temas. Dos motivos, y los dos de bulto:

1. **De noche su color era más oscuro que el fondo.** `--cerco` valía
   `rgba(4,6,10,.5)` sobre un `--f-1` de `#0B0F13`. Una capa que sólo puede
   RESTAR luz sobre un fondo que ya está a 19 de 255 no resta nada.
2. **A plena luz iba a `--cercos: 0`**, o sea apagada del todo, por la regla
   de la etapa 7 («a plena luz no se ve la mesa, se ve el pliego»).

Y encima la franja lateral por la que asoma iba de 9 % a 25 % del ancho: en una
pantalla de 1200 son 108 px de canto que se apagan antes de llegar al pliego.

### Lo que se cambió

- **De noche la mesa SUMA en vez de restar**, y eso además es lo cierto: bajo
  el pliego no hay vacío, hay **madera**, y una mesa de taller de noche no es
  negra — es marrón oscuro cogiendo lo que le llega de la lámpara. Lo que
  dibuja la textura (cercos de tinta, desgaste) es justo donde la madera está
  pelada y devuelve más luz. `--cerco: rgba(74,60,44,.18)`.
- **A plena luz entra, pero no como mesa: como HUELLAS DE LA MESA EN LA HOJA.**
  No contradice la regla de la etapa 7. El mapa se pidió con «*a few smudges
  and thumb marks*» dentro, y una hoja que ha estado en un taller las tiene.
  `--cercos: .26`, `--cerco: rgba(94,72,44,.30)`.
- **La franja se abre de 9/25 a 13/32.** El centro sigue siendo del texto: eso
  no se toca.

### Los dos valores no pueden ser el mismo, y la razón es de signo

Es la misma lección que ya costó una ronda con `--sub` y con las láminas
(§3): **de noche esta capa ACLARA el fondo y el texto es claro**, así que cada
punto que sube se lo quita al texto de encima; **a plena luz OSCURECE y el
texto es oscuro**, y pasa lo mismo por el otro lado. Un solo valor rompe uno de
los dos temas.

Salió midiendo, no estimando:

| | valor probado | peor texto de la página |
|---|---|---|
| de noche | 0,30 | **4,42:1** — por debajo del mínimo |
| de noche | **0,18** | **4,60:1** |
| a plena luz | 0,34 | **4,56:1** — por debajo del 4,61 de la casa |
| a plena luz | **0,26** | **4,68:1** |

### Y `_caja.js` ahora sabe componerla

Hasta hoy la herramienta no modelaba esta capa —no hacía falta, estaba
apagada—. Se le añadieron dos cosas que las otras pátinas no necesitaban:

- **`cover`**: la máscara no se repite, se escala a cubrir la ventana y se
  ancla arriba a la izquierda (no hay `mask-position`, o sea `0 0`).
- **`banda`**: la opacidad vive en el PADRE (`--cercos`) y el padre lleva
  además su propia máscara horizontal. **Se lee del CSS**, no se copia a la
  herramienta, para que no se descuadre el día que se toquen las paradas.

*Aviso de precisión, dicho porque cambia la lectura: la herramienta compone las
capas de color ANTES que las fotos, y la mesa va en realidad por ENCIMA de la
pared. Donde las dos se suman, la cifra sale un pelo del lado seguro.*

---

## 6 · Dónde va cada metal (etapa 21)

Las cinco pátinas (§5) son de la casa entera y van en las capas fijas. Las dos
texturas que salen de los modelos de Meshy son **materia de pieza**, y desde la
etapa 21 están en todas las piezas del material que les toca — no en dos cada
una, que era lo que había.

| textura | material | piezas |
|---|---|---|
| `tex-acero.webp` (`--u-tex5`) | acero torneado | el componedor y su rodilla · **el redondo del llavero** · el botón «Las tres puertas» · la pera del interruptor de la lámpara |
| `tex-cuna.webp` (`--u-tex6`) | plomo fundido | los tipos que caen en el componedor · **el bloque del número de unidad** · **la regleta de la barra de avance** |

Las dos entran en `background-blend-mode: overlay`. Con un gris medio, `overlay`
no cambia nada y sólo modula lo que ya hay: por eso el mismo archivo sirve en
los dos temas sin traer color propio, y por eso una textura mal centrada se
notaría en el acto.

**Rango medido de los dos archivos**, que es lo que decide el peor caso:
acero 99–160 sobre 255, plomo 111–144. Compuesto contra el fondo real, el
número sobre el bloque de plomo se queda en **5,3:1** con el píxel más claro de
la textura debajo.

**Dónde NO va la textura, y sigue sin ir:** en el botón «Abrir» (la cuña). Se
probó en la etapa 14.4 y la banda de los glifos se hundió de 4,83 a 1,12:1 a
plena luz. Una textura sólo entra donde no hay letra encima.
