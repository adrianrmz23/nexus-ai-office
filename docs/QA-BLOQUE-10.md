# QA — Bloque 10

## 1. Migración y seguridad

- [ ] La migración `202607260010_analytics_feedback.sql` termina sin errores.
- [ ] Existen `analytics_settings`, `usage_budgets`, `model_recommendation_events` y `user_feedback`.
- [ ] RLS está habilitado en las cuatro tablas.
- [ ] Un miembro de otro workspace no puede leer ni escribir registros.
- [ ] Un miembro normal puede evaluar respuestas, pero no modificar configuración ni presupuestos.
- [ ] Owner y admin pueden administrar configuración y presupuestos.

## 2. Feedback en conversaciones

1. Abre una conversación con una respuesta completada.
2. Pulsa **Útil**, **Parcial** o **No útil**.
3. Selecciona de 1 a 5 estrellas.
4. Registra correcciones y una nota.
5. Guarda.

Validar:

- [ ] Se muestra confirmación.
- [ ] Al recargar se conserva la evaluación.
- [ ] Solo existe una evaluación del usuario por mensaje.
- [ ] Editar la evaluación actualiza la misma fila.
- [ ] No aparecen controles en mensajes de usuario, fallidos, cancelados o en streaming.
- [ ] La fila deriva correctamente proyecto, conversación, run raíz, modelo y proveedor.

## 3. Dashboard analítico

Abre `/app/analitica`.

- [ ] El menú **Analítica** está habilitado.
- [ ] Los periodos 7, 30, 90 días y todo el historial funcionan.
- [ ] El filtro por proyecto limita ejecuciones, feedback, handoffs y recomendaciones.
- [ ] Se muestran tokens, duración promedio y P95.
- [ ] Los costos desconocidos aparecen como pendientes.
- [ ] Se muestran ejecuciones de equipo parciales cuando existan.
- [ ] Las tablas de modelos, proveedores, agentes y proyectos usan datos reales.
- [ ] El historial muestra recomendado, utilizado, cambio manual y feedback posterior.

## 4. Recomendaciones

### Recomendador manual

1. Abre `/app/modelos/recomendador`.
2. Calcula una recomendación.
3. Espera el indicador **Recomendación registrada para analítica**.
4. Recarga la página.

- [ ] No se crean duplicados por recargar la misma recomendación.
- [ ] El evento aparece como fuente `manual` en Analítica.

### Chat

1. Envía un mensaje con selección automática.
2. Envía otro eligiendo un modelo distinto al recomendado.

- [ ] Cada run raíz crea un evento `runtime`.
- [ ] El segundo evento se marca como reemplazado cuando corresponda.
- [ ] La conversación sigue funcionando aunque el registro analítico falle.

## 5. Aprendizaje observado

- [ ] Un modelo sin feedback inicia con puntaje histórico neutral de 50.
- [ ] Resultados aceptados y bien calificados elevan su puntaje.
- [ ] Rechazos y correcciones lo reducen.
- [ ] Con al menos tres evaluaciones positivas, el recomendador muestra el motivo de buen historial.
- [ ] El historial no sustituye capacidades obligatorias como visión, herramientas o contexto.

## 6. Presupuestos

1. Configura moneda visible y tipo de cambio manual.
2. Crea un presupuesto para toda la oficina.
3. Crea otro para un proyecto.

- [ ] No existen dos presupuestos activos para el mismo alcance.
- [ ] El gasto mensual se calcula solo con costos conocidos y convertibles.
- [ ] Sin conversión disponible, el estado aparece como desconocido.
- [ ] El estado cambia a advertencia al superar el umbral.
- [ ] El estado cambia a excedido al llegar al 100 %.
- [ ] Desactivar conserva el historial.

## 7. Exportación

- [ ] **Exportar CSV** descarga un archivo UTF-8.
- [ ] Respeta periodo y proyecto seleccionados.
- [ ] Incluye modelos, agentes y proyectos.
- [ ] Abre correctamente en Excel sin romper acentos ni comas.

## 8. Regresión

Ejecutar:

```powershell
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Después validar:

- [ ] Crear y abrir conversaciones.
- [ ] Streaming individual.
- [ ] Orquestación de equipo y handoffs.
- [ ] Recuperación de memoria.
- [ ] Creación de tareas y artefactos.
- [ ] Configuración de modelos y prueba de proveedor.
