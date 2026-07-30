# NEXUS AI OFFICE — Bloque 10.1

## Temas claro/oscuro y reparación del catálogo Gemini

Este bloque mejora la accesibilidad visual de toda la aplicación y corrige la sincronización/visualización de modelos de Google Gemini.

## Apariencia

- Tema claro diseñado específicamente para NEXUS.
- Tema oscuro original conservado.
- Opción Sistema para seguir Windows o el dispositivo.
- Selector rápido en el encabezado.
- Pantalla `/app/configuracion` habilitada.
- Preferencia persistida en `localStorage` por navegador.
- Script previo a hidratación para evitar destellos y errores de tema.
- Toaster adaptado al tema activo.
- Componentes migrados a tokens semánticos de color.
- Mejor contraste en formularios, tarjetas, chat, tablas, métricas, código y navegación.

## Gemini

Se corrigieron cuatro debilidades del flujo anterior:

1. El adaptador utilizaba `baseModelId`, lo que podía colapsar variantes diferentes.
2. No recorría `nextPageToken`.
3. El catálogo ocultaba errores de PostgREST y devolvía una lista vacía.
4. La sincronización no llevaba al usuario al catálogo filtrado del proveedor.

Ahora NEXUS:

- usa el identificador exacto devuelto en `models[].name`;
- pagina hasta recuperar el catálogo completo;
- elimina duplicados sin perder la primera descripción completa;
- guarda modelos y capacidades en lotes;
- verifica el conteo final del proveedor;
- muestra errores reales de Supabase;
- redirige al catálogo filtrado después de sincronizar;
- permite abrir directamente los modelos de cada proveedor.

## Instalación

No requiere migración SQL, dependencias nuevas ni variables de entorno.

1. Detén Next.js.
2. Extrae el paquete sobre la raíz del proyecto.
3. Elimina `.next`.
4. Ejecuta `npm run typecheck`.
5. Ejecuta `npm run lint`.
6. Ejecuta `npm run test:run`.
7. Ejecuta `npm run build`.
8. Inicia `npm run dev`.

## Reparación de Gemini

Después de aplicar el bloque:

1. Abre `Modelos IA → Google Gemini`.
2. Pulsa `Probar conexión`.
3. Pulsa `Sincronizar modelos`.
4. NEXUS redirigirá a `/app/modelos?provider=<ID>`.
5. El texto debe indicar cuántos modelos se sincronizaron y cuántos quedaron registrados.

Consulta `docs/QA-BLOQUE-10-1.md` para las pruebas completas.
