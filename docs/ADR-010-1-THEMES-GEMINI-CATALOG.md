# ADR 010.1 — Temas y catálogo Gemini

## Decisión

NEXUS utilizará tokens semánticos CSS y una preferencia local `light | dark | system`. La apariencia se aplicará antes de hidratar React.

El catálogo Gemini utilizará el nombre exacto del recurso retornado por `models.list`, paginará con `nextPageToken` y persistirá lotes verificables.

## Razones

- Evitar dependencia visual de colores oscuros escritos directamente en componentes.
- Mantener lectura cómoda en diferentes condiciones de luz.
- Evitar colisiones entre variantes de modelos Gemini.
- No ocultar fallos de PostgREST como catálogos vacíos.
- Hacer observable el resultado de cada sincronización.

## Consecuencias

- La preferencia visual es local por navegador en esta etapa.
- No se requiere migración.
- Los modelos antiguos de Gemini no se eliminan automáticamente; pueden desactivarse manualmente si quedaron duplicados por sincronizaciones anteriores.
