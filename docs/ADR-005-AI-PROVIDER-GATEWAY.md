# ADR-005 — Gateway desacoplado, credenciales cifradas y catálogo administrable

## Estado

Aceptada — 27 de julio de 2026.

## Contexto

Los agentes de NEXUS deben poder trabajar con OpenAI, Anthropic, Gemini,
OpenRouter y APIs compatibles sin incorporar SDKs o formatos específicos dentro
del dominio. También necesitamos administrar modelos, costos y capacidades sin
codificar recomendaciones en el frontend.

Las claves API son secretos de alto impacto. Guardarlas como texto plano o
exponerlas al navegador impediría utilizar la plataforma con seguridad.

## Decisión

Se separan dos contratos:

```text
AIProvider  → conexión, salud y catálogo publicado por el proveedor
ModelAdapter → completions y streaming normalizados (siguiente bloque)
```

`provider-registry.ts` crea el adaptador adecuado según `provider_type`. Las
rutas y componentes consumen casos de uso comunes, no SDKs de un proveedor.

Los modelos se almacenan como datos administrables. La sincronización captura
los metadatos que el proveedor publique y conserva como desconocidas las
capacidades no verificables. La revisión manual completa contexto, costos y
puntuaciones.

Las credenciales se cifran en el servidor con AES-256-GCM. PostgreSQL almacena
únicamente ciphertext, IV, authentication tag, versión y últimos caracteres. La
clave maestra se obtiene de `NEXUS_CREDENTIAL_ENCRYPTION_KEY`, nunca del
cliente. `provider_credentials` no concede acceso directo a `authenticated`;
solo se opera mediante RPC `security definer` con `search_path` fijo y
verificación de owner/admin.

El recomendador inicial es determinista y combina pesos configurables para:

- tarea;
- tecnología;
- razonamiento;
- contexto;
- capacidades requeridas;
- historial;
- costo;
- velocidad;
- preferencia.

Las capacidades desconocidas reciben una puntuación neutral o conservadora. Una
incompatibilidad explícita elimina el modelo cuando la tarea exige esa
capacidad. Cada resultado muestra razones y confianza, sin cadenas privadas de
pensamiento.

## Consecuencias

- Un agente puede cambiar de modelo o proveedor sin reescribir su lógica.
- El catálogo puede actualizarse sin desplegar frontend nuevo.
- Las claves no regresan completas a la interfaz ni se almacenan en texto plano.
- Perder la clave maestra obliga a volver a capturar las credenciales.
- La sincronización es una ayuda operativa, no una fuente definitiva de precios
  o capacidades.
- El siguiente bloque puede agregar completions y streaming reutilizando los
  contratos ya definidos.
