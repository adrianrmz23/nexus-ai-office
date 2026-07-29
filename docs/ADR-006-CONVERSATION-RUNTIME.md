# ADR-006 — Runtime de conversaciones persistentes y streaming normalizado

## Estado

Aceptada — 28 de julio de 2026.

## Contexto

NEXUS ya administraba proveedores, modelos, agentes y proyectos, pero todavía no
podía ejecutar una conversación real. La implementación debía mantener el
desacoplamiento del proveedor, evitar exponer claves al navegador, conservar el
historial y registrar el costo y estado de cada ejecución.

También era necesario evitar afirmar que existía colaboración multiagente antes
de implementar subtareas y handoffs reales.

## Decisión

Se agrega un runtime de conversación con estas capas:

```text
ChatWorkspace
  → Route Handler autenticado
  → contexto de proyecto y agente
  → selección de modelo
  → ModelAdapter
  → API del proveedor
  → stream normalizado
  → persistencia y uso
```

El navegador recibe eventos NDJSON normalizados:

```text
meta
text delta
usage
completed
error
```

La ruta del servidor descifra la credencial, construye el prompt, ejecuta el
adaptador y actualiza la base de datos. La clave nunca se incorpora a props,
HTML ni respuestas del cliente.

OpenAI utiliza Responses API. OpenRouter y proveedores compatibles utilizan
Chat Completions. Ambos exponen la misma interfaz `ModelAdapter` para completar
o transmitir una respuesta.

Las conversaciones se aíslan por workspace y proyecto. Las relaciones se
validan mediante triggers para impedir cruces entre conversaciones, agentes,
modelos, mensajes, ejecuciones y uso.

El modo equipo de este bloque realiza una sola llamada con el agente líder. El
prompt incorpora el equipo disponible, pero prohíbe afirmar que otros agentes
realizaron trabajo independiente. Los handoffs reales requerirán registros y
estados observables en la fase multiagente.

Los adjuntos de esta fase son únicamente texto y código. Se validan en cliente y
servidor, se bloquean patrones de secretos y se marcan explícitamente como datos
no confiables dentro del prompt.

El historial reciente se recorta según un presupuesto aproximado de contexto.
Una solicitud que exceda el margen seguro de un modelo con ventana conocida se
rechaza antes de gastar tokens.

## Consecuencias

- La aplicación ya ejecuta modelos reales sin acoplar agentes a un SDK.
- Cada respuesta puede auditarse por agente, modelo, proveedor y proyecto.
- El usuario puede cancelar una generación visible.
- Los costos dependen de que precios y uso de tokens estén disponibles.
- El modo equipo es honesto, pero todavía no sustituye al orquestador
  multiagente futuro.
- PDF, imágenes, ZIP, Storage y memoria semántica quedan fuera de este bloque.
- Anthropic y Gemini requieren implementar sus runtimes de streaming antes de
  aparecer como opciones ejecutables.
