# NEXUS AI Office — Endurecimiento del Bloque 08

Este parche mejora la confiabilidad de la orquestación multiagente sin modificar la base de datos.

## Cambios

- Cobertura determinista de objetivos explícitos.
- QA se prioriza cuando la solicitud menciona pruebas, validación, criterios de aceptación o regresiones.
- Diseño y Frontend se priorizan cuando la solicitud pide dirección visual y componentes.
- Debugging queda limitado a causa raíz, fallos, logs y diagnóstico; no sustituye a QA o seguridad.
- El plan propuesto por el LLM se valida y ajusta contra agentes realmente asignados.
- La consolidación solo recibe contribuciones completadas.
- Los pasos fallidos se muestran como estado, pero no se usan como evidencia técnica.
- La respuesta final no puede generar su propia lista de participantes.
- NEXUS agrega de forma determinista una sección `Participación verificada` usando únicamente handoffs completados.
- Markdown seguro para títulos, listas, énfasis, enlaces, citas y bloques de código.
- Los resúmenes de handoffs también renderizan Markdown.

## Aplicación

1. Detén `npm run dev`.
2. Extrae el ZIP en la raíz del proyecto.
3. Acepta reemplazar los archivos.
4. Elimina `.next`.
5. Ejecuta `npm run typecheck`, `npm run lint`, `npm run test:run` y `npm run build`.
6. Inicia nuevamente con `npm run dev`.

No requiere una migración nueva ni variables de entorno adicionales.
