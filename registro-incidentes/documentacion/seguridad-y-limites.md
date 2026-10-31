# Seguridad y límites

## Qué prueba cada pieza

| Pieza | Qué demuestra | Frente a quién protege |
|---|---|---|
| **PIN personal**: en el servidor solo se guarda su hash con sal y un secreto aparte (*pepper*); se bloquea al quinto fallo | Que quien firmó conocía el PIN de esa persona | Compañeros y terceros |
| **Clave del dispositivo**: ECDSA P-256 con la clave privada no exportable | Que el parte se firmó en un dispositivo dado de alta para esa persona y que su contenido no ha cambiado desde entonces | Todos, también dirección: la clave privada no sale nunca del dispositivo |
| **Cadena de huellas**: cada parte incluye la huella del anterior | Que no se ha modificado, borrado ni reordenado ningún parte intermedio | Quien edite la hoja |
| **Ancla diaria por correo**, mejor si también va a alguien de fuera | Qué partes existían cada día | También dirección, si el correo llega a un tercero |
| **Resguardo** por correo al empleado | Que el empleado supo en el momento qué se registró a su nombre | Suplantaciones y cambios posteriores |
| **Hora del servidor** | Cuándo llegó el parte. La hora del dispositivo se guarda, pero no cuenta como prueba | — |

Lo que se firma son los **datos firmados**: protocolo, firmante, nº de historial, texto, hora del dispositivo, un número aleatorio y la declaración. La huella de la cadena añade el nº de parte, la hora del servidor, la clave usada, la firma y la huella anterior. El formato exacto está en [`app/cripto.js`](../app/cripto.js) y [`apps-script/Codigo.gs`](../apps-script/Codigo.gs), y las pruebas comprueban que ambos coinciden byte a byte.

## Escenarios

- **Alguien conoce el PIN de un compañero y firma en la tablet en su nombre.** En la tablet compartida el PIN es la única barrera personal. Hay que mantenerlo en secreto y taparlo al teclearlo. Si el afectado dio un correo, recibe el resguardo y lo detecta; si no lo dio, no hay aviso.
- **Dirección quiere cambiar lo que escribió un empleado.** La hoja es suya y puede editarla, pero la firma del dispositivo deja de cuadrar (`verificar.html`). Si recalcula las huellas, no cuadran con las anclas ya enviadas. Y el empleado conserva su resguardo. Hay una prueba automática de este caso.
- **Alguien borra los últimos partes.** La cadena sola no lo detecta. Lo detectan el ancla, si se envió después, y los resguardos.
- **Se pierde la tablet o un móvil.** Sin el PIN no se puede firmar. Retira el dispositivo con **Nuevo código de alta → Retirar dispositivos anteriores: Sí** para cada persona.
- **Alguien encuentra la URL del backend.** No puede leer nada: no existe ninguna operación que devuelva partes. Sin un dispositivo dado de alta y el PIN tampoco puede escribir. Probar códigos de alta no sirve: tienen 8 caracteres, valen una vez, caducan a las 48 horas y hay un límite de 60 peticiones por minuto.
- **Roban la cuenta de Google de dirección.** Es el riesgo más grave. Activa la verificación en dos pasos en esa cuenta.

## Límites conocidos

- **Verificación en dos tiempos.** Apps Script no sabe verificar firmas ECDSA. Al recibir un parte, el registro comprueba el PIN y que el dispositivo está dado de alta. La firma criptográfica se verifica después con `verificar.html`.
- **La clave puede perderse.** Vive en el almacenamiento del navegador. Se pierde si se borran los datos del navegador o, en iPhone y iPad, si la página no se abre desde el icono de la pantalla de inicio. Entonces hay que repetir el alta. Lo ya firmado sigue siendo verificable, porque las claves públicas se conservan.
- **En la tablet compartida, la clave no identifica a la persona.** Prueba que se firmó en esa tablet; quién firmó lo prueba el PIN.
- **Valor legal: firma electrónica simple.** Se admite como prueba (art. 25 del Reglamento eIDAS), pero si alguien la impugna, es la clínica quien tiene que demostrar su autenticidad (art. 326.3 LEC). Para eso sirven la cadena, las anclas, los resguardos y el verificador. Solo un servicio de confianza cualificado invertiría esa carga.
- **El contenido es responsabilidad de quien escribe.** Si alguien escribe datos de más, quedan registrados. La página avisa si detecta un DNI, un teléfono o un correo.

## Ideas para una fase 2

- **Sello de tiempo de un tercero** para las anclas: RFC 3161 cualificado u OpenTimestamps.
- **Passkeys** en los móviles de quien, voluntariamente, quiera usarlos. El desbloqueo lo hace el propio móvil (código, patrón, huella o cara) y la clínica no recibe ningún dato biométrico, ni siquiera sabe qué método se usó. Nunca con biometría en la tablet compartida. Hay que validarlo con el DPD: las autoridades aún no se han pronunciado sobre las passkeys.
- **Resumen semanal** para dirección.
