# NEXUS AI OFFICE — Bloque 10

## Analítica, costos y aprendizaje operativo

Este bloque cierra el ciclo entre recomendación, ejecución y retroalimentación. NEXUS ahora puede medir el comportamiento real de proyectos, agentes, proveedores y modelos; registrar si una respuesta fue útil; vigilar presupuestos; exportar métricas; y utilizar el historial observado para mejorar futuras recomendaciones.

## Implementado

- Dashboard funcional en `/app/analitica`.
- Filtros por periodo y proyecto.
- Métricas de:
  - ejecuciones completadas, fallidas y canceladas;
  - ejecuciones de equipo completas, parciales, fallidas y canceladas;
  - handoffs;
  - tokens de entrada y salida;
  - costo conocido y costo pendiente;
  - duración promedio y percentil 95;
  - calificación, aceptación y correcciones;
  - tiempo ahorrado estimado;
  - recomendaciones seguidas o sustituidas.
- Comparación por modelo, proveedor, agente y proyecto.
- Retroalimentación en cada respuesta completada del chat:
  - útil, parcialmente útil o no útil;
  - calificación de 1 a 5;
  - correcciones posteriores;
  - nota y minutos ahorrados opcionales.
- Historial de recomendaciones del chat y del recomendador manual.
- Puntaje histórico observado incorporado al recomendador.
- Presupuestos mensuales globales o por proyecto.
- Alertas visuales al alcanzar el umbral o rebasar el presupuesto.
- Configuración manual de moneda y tipo de cambio.
- Exportación CSV.
- Indicadores resumidos en el dashboard principal.
- RLS, validación de alcance y auditoría.

## Modelo de datos

La migración crea:

- `analytics_settings`
- `usage_budgets`
- `model_recommendation_events`
- `user_feedback`

La retroalimentación se enlaza automáticamente con el mensaje, la conversación, el proyecto, el run raíz, el modelo, el proveedor y el evento de recomendación correspondiente.

## Privacidad y costos

- NEXUS no consulta un tipo de cambio externo ni inventa conversiones.
- Los costos sin tarifa revisada permanecen como `Pendiente`.
- La moneda original siempre se conserva.
- El tipo de cambio configurado se utiliza únicamente para visualización.
- Las evaluaciones se comparten dentro del workspace para producir analítica operativa, pero cada usuario solo puede editar su propia evaluación.

## Instalación

1. Ejecuta `supabase/migrations/202607260010_analytics_feedback.sql` en Supabase SQL Editor.
2. Detén Next.js y elimina `.next`.
3. Ejecuta `npm run typecheck`.
4. Ejecuta `npm run lint`.
5. Ejecuta `npm run test:run`.
6. Ejecuta `npm run build`.
7. Inicia `npm run dev`.

No se agregaron dependencias ni variables de entorno.

## Prueba mínima

```text
Conversación
→ evaluar una respuesta
→ abrir Analítica
→ verificar calidad, tokens y modelo
→ crear presupuesto mensual
→ ejecutar una nueva conversación
→ revisar consumo y recomendación registrada
→ exportar CSV
```

Consulta `docs/QA-BLOQUE-10.md` para el recorrido completo.
