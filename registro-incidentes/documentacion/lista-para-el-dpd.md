# Lista para el delegado de protección de datos

Esto **no es asesoramiento legal**. Es una lista de puntos para revisar con el delegado de protección de datos (DPD) y, en lo laboral, con un abogado laboralista, antes de usar el registro con datos reales. Sale de una investigación hecha el 31/10/2026; casi todas las fuentes se consultaron a través de extractos de búsqueda, así que hay que verificar el texto vigente.

## Protección de datos

- [ ] **DPD.** Las clínicas que llevan historias clínicas tienen que tener delegado de protección de datos (art. 34.1.l LOPDGDD). Solo se exceptúa al profesional que ejerce a título individual.
- [ ] **Registro de actividades.** Añadir el tratamiento «registro de incidentes con pacientes»: contiene datos de salud, del paciente identificado por nº de historial. Añadir también los datos del personal que firma.
- [ ] **Base jurídica.** Para los pacientes, la que determine el DPD (por ejemplo, la gestión de la asistencia sanitaria y su calidad). Para el personal, la ejecución del contrato y el poder de dirección (art. 6.1.b RGPD y art. 20 ET), con el interés legítimo (art. 6.1.f) como complemento. **No el consentimiento**, que en el trabajo no se considera libre.
- [ ] **Evaluación de impacto (EIPD).** Decidir si hace falta. La lista de la AEPD (art. 35.4) incluye las categorías especiales de datos, y con dos criterios suele ser obligatoria. Si algún día se añade una IA que ordene los partes, casi seguro que sí.
- [ ] **Encargado del tratamiento.** Google Workspace aloja la hoja: confirmar en la consola de administración que el anexo de tratamiento de datos está aceptado. GitHub solo sirve la página y nunca recibe datos.
- [ ] **Información a los pacientes.** Que la política de privacidad de la clínica cubra la gestión de incidentes.
- [ ] **Información al personal.** Completar y entregar [`informacion.html`](../informacion.html) antes de empezar (art. 13 RGPD y art. 11 LOPDGDD).
- [ ] **Conservación.** Propuesta: 5 años desde que se cierra el incidente (es lo que tarda en prescribir la acción contractual, art. 1964 del Código Civil), o hasta que termine un procedimiento; después, bloquear y borrar. Lo que sea información clínica va además a la historia clínica (mínimo 5 años, art. 17 de la Ley 41/2002).
- [ ] **Seguridad.** Verificación en dos pasos en las cuentas de dirección. La hoja no se comparte. Las exportaciones para verificar no se envían ni se suben a ningún sitio.
- [ ] **Avisos sin datos de salud.** Los correos y los mensajes de Chat solo dicen el nº de parte. La AEPD desaconseja enviar datos de salud por correo sin cifrar.

## Personal y firma

- [ ] **El móvil personal tiene que ser voluntario de verdad.** Eso exige:
  - una tablet de la clínica siempre disponible, que funcione igual;
  - que negarse o echarse atrás no tenga consecuencias;
  - que en el móvil no se guarde nada más que el alta;
  - que no haya avisos fuera de la jornada;
  - que la elección quede por escrito.

  En 2026 la AEPD sancionó a una empresa que imponía apps en los móviles de sus trabajadores: su supuesta voluntariedad no valió porque no había alternativa real. La Audiencia Nacional (SAN 14/2024) anuló una cláusula que obligaba a usar el móvil personal para el doble factor.
- [ ] **Sin biometría.** Desde 2023 la AEPD considera que la biometría para autenticarse es una categoría especial de datos, y que en el trabajo no tiene base jurídica si existe una alternativa como el PIN. Este registro no usa ninguna.
- [ ] **Norma de uso de la tablet** (art. 87.3 LOPDGDD), con participación de la representación de los trabajadores si la hay. Hay un borrador en [plantillas/norma-de-uso-de-la-tablet.md](plantillas/norma-de-uso-de-la-tablet.md).
- [ ] **Representación de los trabajadores.** Si hay delegado de personal (empresas de 11 a 49 personas, o de 6 a 10 si lo eligen), puede hacer falta su informe previo (art. 64.5.f ET).
- [ ] **Acuerdo de firma con cada persona.** Borrador en [plantillas/acuerdo-de-firma.md](plantillas/acuerdo-de-firma.md).
- [ ] **Política «firmar no es culpar»** y límites al uso disciplinario de los partes. Borrador en [plantillas/politica-firmar-no-es-culpar.md](plantillas/politica-firmar-no-es-culpar.md).
- [ ] **Desconexión digital** (art. 88 LOPDGDD): el sistema no envía nada al personal fuera de su jornada. El resguardo llega en el momento de firmar.

## Fuera de este registro

- **Hojas de reclamaciones.** Siguen siendo obligatorias y este registro no las sustituye. Las reclamaciones formales no se anotan aquí.
- **Firma biométrica de presupuestos o consentimientos** (por ejemplo, firmar en una tableta con un programa de gestión): en un expediente de 2024 (AI/00407/2024), la AEPD consideró datos biométricos el trazo de una firma digitalizada (posición, tiempo, presión). Si la clínica la usa con pacientes, que lo valore el DPD.

## Fuentes consultadas

[P] = fuente oficial, vista sobre todo en extractos. [S] = fuente secundaria.

- [P] AEPD, guía sobre control de presencia mediante sistemas biométricos (nov. 2023): https://www.aepd.es/guias/guia-control-presencia-biometrico.pdf
- [P] AEPD, criterio sobre sistemas biométricos para autenticación (18/07/2025): https://www.aepd.es/informes-y-resoluciones/criterios-juridicos-aepd/adecuacion-y-proporcionalidad-sistemas-biometricos-para-autenticacion
- [P] AEPD, expediente AI/00407/2024: https://www.aepd.es/documento/ai-00407-2024.pdf
- [P] AEPD, guía «La protección de datos en las relaciones laborales» (actualizada en dic. 2025): https://www.aepd.es/guias/la-proteccion-de-datos-en-las-relaciones-laborales.pdf
- [P] AEPD, guía para profesionales del sector sanitario: https://www.aepd.es/guias/guia-profesionales-sector-sanitario.pdf
- [P] AEPD, ¿está obligada mi clínica a designar un DPD?: https://www.aepd.es/preguntas-frecuentes/16-salud/2-profesionales-sanitarios/FAQ-1634-esta-obligada-mi-cl%C3%ADnica-a-designar-un-delegado-de-proteccion-de-datos
- [P] AEPD, lista de tratamientos que requieren EIPD (art. 35.4): https://www.aepd.es/documento/listas-dpia-es-35-4.pdf
- [P] AEPD, nota técnica sobre teletrabajo y dispositivos personales: https://www.aepd.es/guias/nota-tecnica-proteger-datos-teletrabajo.pdf
- [P] LOPDGDD: https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673
- [P] Estatuto de los Trabajadores: https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430
- [P] Ley de Enjuiciamiento Civil (art. 326): https://www.boe.es/buscar/act.php?id=BOE-A-2000-323
- [P] Ley 6/2020, de servicios electrónicos de confianza: https://www.boe.es/buscar/act.php?id=BOE-A-2020-14046
- [P] Ley 41/2002, de autonomía del paciente: https://www.boe.es/buscar/act.php?id=BOE-A-2002-22188
- [P] CNIL, biometría en los smartphones (2018): https://www.cnil.fr/fr/biometrie-dans-les-smartphones-des-particuliers-application-du-cadre-de-protection-des-donnees
- [P] EDPB, dictamen 11/2024 sobre reconocimiento facial en aeropuertos: https://www.edpb.europa.eu/system/files/2024-05/edpb_opinion_202411_facialrecognitionairports_en.pdf
- [S] Sanción de 2026 por imponer apps en móviles personales: https://www.enforcementtracker.com/ETid-3127
- [S] SAN 14/2024 sobre el móvil personal y el doble factor: https://sincro.es/blog/tribunales/teletrabajo-es-nula-la-clausula-que-obligue-al-trabajador-a-aportar-su-movil-personal/
