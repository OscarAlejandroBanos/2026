# Proteger las cuentas

## ¿Se puede poner contraseña a la hoja o a una carpeta de Drive?

No. Google Drive y Hojas de cálculo no tienen contraseñas por archivo. Las protecciones de la hoja (rangos y pestañas protegidos) solo frenan a otras personas con quienes se comparte: el propietario siempre puede editar. Para Google, quien entra en la cuenta de dirección *es* dirección. (Google ofrece cifrado del lado del cliente, pero solo en las ediciones más caras de Workspace.)

Por eso la protección tiene dos capas:

1. **Que nadie más pueda entrar en la cuenta.** Ver [las medidas](#medidas-para-la-cuenta-por-orden-de-importancia).
2. **Que, aunque alguien entrara, no pudiera cambiar nada sin que se note.** Eso ya lo hace el registro.

## Qué pasa si alguien entra en la cuenta de dirección

| Lo que podría intentar | Qué lo delata |
|---|---|
| Cambiar o borrar un parte | La firma del dispositivo deja de cuadrar (`verificar.html`), la cadena se rompe, las anclas enviadas fuera no coinciden y el empleado tiene su resguardo |
| Firmar en nombre de alguien dándole de alta un dispositivo | Esa persona recibe al momento «Alta de un dispositivo a tu nombre» (también en su correo anterior), su PIN deja de funcionar y queda en la bitácora y en el ancla |
| Quitar al de fuera de las anclas o quitar el aviso de Chat | Correo a los destinatarios anteriores y nuevos, y mensaje en el Chat que se quita. Queda en la bitácora |
| Desactivar el registro (borrar el disparador o la hoja) | Las anclas dejan de llegar. Llegan como mínimo una vez por semana, así que el de fuera lo nota |
| Compartir la hoja con otra persona | El ancla avisa de que ha cambiado quién tiene acceso |
| Leer los partes | Dentro de la cuenta no se puede impedir. Por eso lo crucial es que nadie más entre (ver [ir más lejos](#ir-más-lejos-cifrar-los-partes)) |
| Cambiar el código del registro | Es el punto ciego: con la cuenta se puede cambiar el programa. Lo ya anclado sigue protegido, pero lo que llegue después ya no. La defensa es la cuenta blindada y las anclas fuera |

**Clave:** las anclas tienen que llegar a un correo **de fuera del Workspace**, por ejemplo el del delegado de protección de datos o una cuenta personal. Quien entrara en la cuenta podría borrar los correos que llegan a ella, pero no los que llegan a otro sitio.

## Medidas para la cuenta (por orden de importancia)

1. **Una cuenta solo de dirección.** Si alguien de la clínica usa la cuenta de dirección para el correo, la agenda o cualquier otra cosa, el registro no puede estar ahí. Crea un usuario solo para dirección que no se abra en ningún ordenador de la clínica. Lo ideal es una cuenta por persona de dirección: se paga una licencia por usuario.
2. **Verificación en dos pasos.** Lo más seguro es una llave de seguridad física; si no, el aviso de Google en el móvil de quien es dueño de la cuenta. Evita el SMS si puedes. Guarda los códigos de reserva en papel, en casa.
3. **Contraseña nueva y única**, que no sepa nadie más. Si alguien de la clínica la ha sabido alguna vez, cámbiala.
4. **Ninguna sesión abierta en la clínica**: ni en el ordenador de recepción ni en la tablet. En el ordenador de dirección, usa un perfil de Chrome solo para esta cuenta y bloqueo de pantalla.
5. **Revisa los dispositivos conectados** de vez en cuando. Está en myaccount.google.com → Seguridad → Tus dispositivos: cierra la sesión en los que no reconozcas. Mira también «Actividad de seguridad reciente».
6. **El teléfono y el correo de recuperación** tienen que ser personales de dirección, nunca de la clínica.
7. **En la consola de administración** (admin.google.com):
   - obliga la verificación en dos pasos;
   - limita la duración de las sesiones;
   - activa las alertas de actividad sospechosa;
   - no des el rol de administrador a nadie más.

   Los nombres exactos de los menús pueden variar.
8. **GitHub con verificación en dos pasos.** Quien pueda cambiar la página del personal podría cambiar lo que ve y lo que envía la tablet.
9. **El ancla, a alguien de fuera.** Ponlo en **Cambiar avisos y ajustes → Correos extra para el ancla diaria**.

## Ir más lejos: cifrar los partes

Si os preocupa que alguien que entrara en la cuenta pudiera **leer** los partes, hay una mejora posible, **todavía no implementada**. La tablet cifraría el texto con una clave que solo conoce dirección. En la hoja se vería texto ilegible y, para leerlo, dirección abriría una página y escribiría su contraseña.

- **A favor:** ni con la cuenta se podrían leer los partes.
- **En contra:** la hoja deja de leerse directamente, y si se olvida la contraseña, los partes se pierden para siempre.
