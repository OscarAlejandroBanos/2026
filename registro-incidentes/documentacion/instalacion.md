# Instalación paso a paso

Se tarda una media hora. Hace falta:

- **Una cuenta de Google Workspace** (de empresa) de dirección. No uses una cuenta personal de Gmail: con Workspace hay contrato de encargado del tratamiento con Google.
- **Una cuenta de GitHub** para publicar la página del personal.
- **Una tablet para recepción.** Es la vía normal para firmar; usar el móvil propio es voluntario.

> Antes de usarlo con datos reales, repasa la [lista para el delegado de protección de datos](lista-para-el-dpd.md).

## 0. Proteger la cuenta de dirección

Antes de nada, sigue [proteger-las-cuentas.md](proteger-las-cuentas.md). Lo esencial:
- La hoja tiene que estar en una cuenta que **solo use dirección** y que no esté abierta en ningún ordenador de la clínica.
- La cuenta necesita **verificación en dos pasos**.

## 1. Crear la hoja de dirección

1. Entra en Google Drive con la cuenta de Workspace de dirección.
2. **Nuevo → Hojas de cálculo de Google.** Ponle de nombre «Registro de incidentes».
3. No la compartas con nadie que no sea de dirección.

## 2. Pegar el código

1. En la hoja: **Extensiones → Apps Script.**
2. Borra lo que haya en `Código.gs` y pega el contenido de [`apps-script/Codigo.gs`](../apps-script/Codigo.gs).
3. En **Configuración del proyecto** (rueda dentada), marca «Mostrar el archivo de manifiesto "appsscript.json" en el editor».
4. Vuelve al editor, abre `appsscript.json` y sustituye su contenido por el de [`apps-script/appsscript.json`](../apps-script/appsscript.json).
5. Guarda.

## 3. Configurar

1. Recarga la hoja. Aparece el menú **Registro de incidentes**.
2. **Registro de incidentes → Configurar (primera vez).**
3. Google pide permisos. Como el script es tuyo, verás «Google no ha verificado esta aplicación»: pulsa **Configuración avanzada → Ir a…** y acepta.
4. Responde a las preguntas:
   - **Correos de dirección** para los avisos.
   - **Webhook de Google Chat** (opcional; ver el paso 6). Puedes dejarlo en blanco y ponerlo después.
   - **Dirección de la página del personal.** La tendrás en el paso 5; puedes ponerla después desde **Cambiar avisos y ajustes**.
   - **Correos extra para el ancla diaria.** Muy recomendado: un correo **de fuera del Workspace**, como el del delegado de protección de datos o una cuenta personal. Así, aunque alguien entrara en la cuenta de dirección, no podría borrar esa constancia.

Se crean las pestañas Incidentes, Firmantes, Dispositivos, Anclas, Bitácora y una oculta, Altas. También se programa el ancla: se revisa cada noche a las 23:00 y se envía si hay novedades y, como mínimo, una vez por semana.

## 4. Publicar el backend

1. En Apps Script: **Implementar → Nueva implementación**, tipo **Aplicación web.**
2. **Ejecutar como: Yo.** **Quién tiene acceso: Cualquier usuario.**
3. **Implementar** y copia la URL que termina en `/exec`.

Si no aparece «Cualquier usuario», el administrador del Workspace tiene que permitir compartir fuera de la organización. «Cualquier usuario» no da acceso a la hoja: solo permite enviar partes, y el registro solo los acepta desde un dispositivo dado de alta y con el PIN de la persona.

## 5. Publicar la página del personal

1. En tu repositorio de GitHub, edita [`config.js`](../config.js) y pon la URL del paso 4:
   ```js
   export default {
     API_URL: 'https://script.google.com/macros/s/…/exec',
   };
   ```
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)`. Guarda.
3. En un par de minutos la página estará en `https://TU-USUARIO.github.io/registro-incidentes/`.
4. En la hoja: **Registro de incidentes → Cambiar avisos y ajustes** y pon esa dirección.

## 6. Avisos en el móvil de dirección (opcional)

Los correos llegan siempre. Para tener además una notificación en el móvil, igual que un WhatsApp:

1. En Google Chat, crea un espacio solo con dirección.
2. En el espacio: **Aplicaciones e integraciones → Webhooks → Añadir webhook.** Copia la URL.
3. En la hoja: **Cambiar avisos y ajustes**, y pégala en «Webhook de Google Chat».
4. En el móvil, instala Google Chat con la cuenta del Workspace y activa las notificaciones.

Si no aparece la opción de webhooks, el administrador del Workspace tiene que permitir los webhooks entrantes en Google Chat. Los avisos solo dicen «Se ha registrado el incidente nº X»: nunca llevan datos del paciente.

## 7. Preparar la tablet

1. Abre la página del personal en el navegador de la tablet.
2. Añádela a la pantalla de inicio:
   - **iPad:** Compartir → Añadir a pantalla de inicio.
   - **Android:** menú ⋮ → Instalar aplicación (o Añadir a pantalla de inicio).
3. A partir de ahora ábrela siempre desde ese icono. En iPad es imprescindible: si no, el dispositivo puede olvidar las altas.

## 8. Dar de alta a cada persona

1. En la hoja: **Registro de incidentes → Dar de alta a un empleado.** Escribe su nombre tal como debe aparecer en la firma.
2. Aparece un código de 8 caracteres, válido 48 horas y una sola vez.
3. En la tablet: **Dar de alta a otra persona aquí**, o la primera pantalla si es el primero. La persona escribe el código, elige su PIN (solo lo sabrá ella) y, si quiere, un correo para sus resguardos.

Si alguien quiere usar también su móvil, de forma voluntaria, genera otro código con **Nuevo código de alta** y que haga lo mismo en su móvil.

## Actualizar el código más adelante

Pega el `Codigo.gs` nuevo y ve a **Implementar → Gestionar implementaciones → Editar (lápiz) → Versión: nueva versión → Implementar.** Así la URL no cambia. Si cambia `app/` o `index.html`, basta con subirlo a GitHub.
