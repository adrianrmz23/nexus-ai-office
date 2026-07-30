# QA — Bloque 10.1

## 1. Temas

- Cambiar a Claro desde el encabezado.
- Recargar y confirmar que el tema permanece.
- Cambiar a Oscuro.
- Cambiar a Sistema y modificar la apariencia de Windows.
- Abrir `/app/configuracion` y repetir las tres opciones.
- Verificar escritorio y móvil.
- Revisar especialmente: Modelos, Conversaciones, Memoria, Tareas, Artefactos y Analítica.
- Confirmar que formularios, placeholders, tarjetas y textos secundarios sean legibles.
- Confirmar que no exista un destello oscuro/claro al recargar.

## 2. Gemini

- Abrir Google Gemini.
- Probar conexión.
- Sincronizar modelos.
- Confirmar redirección al catálogo filtrado.
- Confirmar que el encabezado diga `Mostrando N modelos de Google Gemini`.
- Buscar por nombre e identificador.
- Limpiar filtros y comprobar que OpenAI y Gemini aparezcan juntos.
- Abrir la tarjeta de Google Gemini y usar `Ver modelos`.

## 3. SQL de diagnóstico opcional

```sql
select
  p.display_name,
  p.provider_type,
  count(m.id) as model_count,
  max(m.last_synced_at) as last_sync
from public.ai_providers p
left join public.ai_models m on m.provider_id = p.id
where p.workspace_id = 'TU_WORKSPACE_ID'
group by p.id, p.display_name, p.provider_type
order by p.display_name;
```

## 4. Validación técnica

```powershell
npm run typecheck
npm run lint
npm run test:run
npm run build
```
