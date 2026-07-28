# NEXUS AI Office — Bloque 05

Este bloque incorpora proveedores de inteligencia artificial, catálogo
administrable de modelos y la primera versión del recomendador ponderado. No
realiza todavía conversaciones ni generaciones: prepara conexiones, sincroniza
metadatos y permite configurar qué modelos podrá utilizar cada agente y
proyecto.

## Incluye

- Proveedores iniciales: OpenAI, Anthropic, Google Gemini, OpenRouter y una API
  compatible con OpenAI.
- Adaptadores desacoplados para validar credenciales y consultar los catálogos
  oficiales de modelos.
- Contratos comunes para proveedores, modelos, chat, streaming y herramientas.
- Cifrado de claves API con AES-256-GCM antes de almacenarlas.
- Credenciales accesibles únicamente mediante funciones PostgreSQL protegidas.
- Prueba de conexión y registro de historial técnico.
- Sincronización de modelos desde cada proveedor.
- Alta y edición manual de modelos.
- Capacidades con estado conocido, incompatible o todavía no validado.
- Ventana de contexto, salida máxima, costos y fecha de revisión.
- Puntuaciones por tarea y por tecnología.
- Preferencias de modelo por agente y por proyecto.
- Recomendador determinista con motivos, confianza, alternativa económica y
  alternativa de calidad.
- RLS, aislamiento por workspace y auditoría.
- Navegación y contadores reales en el dashboard.

## 1. Respaldo

```powershell
git add .
git commit -m "chore: checkpoint antes del bloque 05"
```

## 2. Configurar la clave de cifrado

Genera una clave aleatoria de 32 bytes codificada en Base64:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copia el resultado a `.env.local`:

```env
NEXUS_CREDENTIAL_ENCRYPTION_KEY=PEGA_AQUI_LA_CLAVE
```

La variable es exclusiva del servidor. No debe comenzar con `NEXT_PUBLIC_`, no
se debe subir a Git y debe configurarse también en Vercel cuando se despliegue.

> Conserva una copia segura. Si cambias o pierdes esta clave, las credenciales
> ya almacenadas no podrán descifrarse y deberán eliminarse y capturarse de
> nuevo.

## 3. Reemplazar archivos

Extrae el paquete en la raíz del proyecto y permite reemplazar los archivos
existentes. El paquete no contiene `.env.local`, `node_modules`, `.next` ni
`.git`.

No se agregaron dependencias npm nuevas.

## 4. Ejecutar la migración

En Supabase abre `SQL Editor → New query` y ejecuta una sola vez:

```text
supabase/migrations/202607260005_ai_provider_catalog.sql
```

La migración depende de los Bloques 01 a 04. No vuelvas a ejecutar las
migraciones anteriores si ya están aplicadas.

## 5. Reiniciar y validar

Detén `npm run dev`, elimina la caché y valida:

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run typecheck
npm run lint
npm run test:run
npm run build
npm run dev
```

## 6. Prueba funcional

1. Abre `/app/modelos`.
2. Confirma que aparecen cinco proveedores iniciales.
3. Entra al proveedor que utilizarás.
4. Guarda una clave API real.
5. Ejecuta `Probar conexión`.
6. Ejecuta `Sincronizar modelos`.
7. Revisa el catálogo y edita un modelo sincronizado.
8. Completa capacidades, costos y puntuaciones que el proveedor no publique.
9. Abre `/app/modelos/recomendador` y calcula una recomendación.
10. Abre un agente y guarda su modelo principal y alternativas.
11. Abre un proyecto y define presupuesto, velocidad y modelo predeterminado.

La prueba de conexión y la sincronización consultan el catálogo del proveedor;
no envían prompts ni crean una conversación.

## 7. Validación en Supabase

Deben existir estas tablas:

```text
ai_providers
provider_credentials
ai_models
model_capabilities
model_task_scores
model_technology_scores
provider_health_checks
agent_model_preferences
project_model_preferences
model_recommendation_weights
```

La tabla `provider_credentials` no tiene acceso directo para usuarios
autenticados. Las claves se administran mediante estas funciones:

```text
save_provider_credential
get_provider_credential
delete_provider_credential
```

`audit_logs` debe registrar acciones como:

```text
ai_provider.credential_saved
ai_provider.connection_checked
ai_model.created
ai_model.synchronized
agent.model_preference_updated
project.model_preference_updated
```

## Límites deliberados del bloque

- Todavía no se ejecutan completions ni streaming.
- Los catálogos oficiales no siempre incluyen precios, contexto o todas las
  capacidades; esos campos deben revisarse manualmente.
- La sincronización no desactiva automáticamente modelos que dejen de aparecer.
- El recomendador todavía usa un valor neutral para historial, porque aún no
  existen ejecuciones y feedback suficientes.

## Resultado esperado

NEXUS conoce qué proveedores están disponibles, qué modelos ofrece cada uno,
qué capacidades han sido verificadas y qué estrategia prefiere cada proyecto o
agente. El siguiente bloque podrá implementar conversación y streaming sobre
esta capa sin acoplar el dominio a un proveedor concreto.
