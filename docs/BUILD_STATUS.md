# NEXUS AI Office — estado de construcción

Actualizado: 28 de julio de 2026.

## Terminado

- Proyecto Next.js 16 con App Router y TypeScript estricto.
- Sistema visual oscuro y responsive.
- Autenticación, recuperación y onboarding con Supabase.
- Workspaces aislados mediante RLS.
- Catálogo funcional de tecnologías.
- Gestión de proyectos, stack y contexto permanente.
- Catálogo de agentes especializados.
- Ocho agentes iniciales por workspace.
- Equipos por proyecto, liderazgo y recomendación por stack.
- Proveedores iniciales OpenAI, Anthropic, Gemini, OpenRouter y OpenAI-compatible.
- Gateway desacoplado y contratos comunes de IA.
- Cifrado AES-256-GCM para claves API del lado servidor.
- Pruebas de conexión e historial de salud de proveedores.
- Sincronización y administración manual del catálogo de modelos.
- Capacidades, contexto, costos y puntuaciones por tarea y tecnología.
- Preferencias de modelos por agente y proyecto.
- Recomendador ponderado con razones y confianza.
- Carga optimizada del recomendador según tarea y stack.
- Conversaciones persistentes por proyecto.
- Selección de agente, modelo, modo y tipo de tarea.
- Streaming real para OpenAI, OpenRouter y APIs compatibles.
- Cancelación visible y prevención de ejecuciones simultáneas por conversación.
- Historial de mensajes y adjuntos básicos de texto/código.
- Protección de adjuntos contra secretos evidentes.
- Registro de tokens, costo estimado, duración, errores y cancelaciones.
- Contexto permanente de proyecto y agente incorporado en cada ejecución.
- RLS, validación entre workspaces y auditoría para el runtime de conversación.
- Validadores Zod y pruebas unitarias esenciales.

## Siguiente bloque

- Documentos en Supabase Storage.
- Extracción y fragmentación de texto.
- Embeddings y pgvector.
- Memoria global, de proyecto y de agente.
- Recuperación de contexto con fuentes visibles.
- Administración, edición y eliminación de memorias.

## Después

- Orquestación multiagente y handoffs reales.
- Herramientas con permisos y esquemas Zod.
- Tareas, artefactos y diffs.
- Feedback y aprendizaje del recomendador.
- Analítica, presupuestos y límites operativos.
- Runtimes de Anthropic y Gemini.
- Seguridad, rendimiento y preparación final para producción.
