# NEXUS AI Office

Centro personal de desarrollo asistido por IA construido con Next.js,
TypeScript y Supabase. La plataforma administra workspaces, tecnologías,
proyectos, agentes y modelos de inteligencia artificial con aislamiento por RLS
y una arquitectura desacoplada de proveedores.

## Estado actual

- Autenticación y onboarding funcionales.
- Workspaces protegidos mediante RLS.
- Catálogo de tecnologías.
- Gestión de proyectos y contexto permanente.
- Catálogo de agentes y equipos por proyecto.
- Proveedores de IA con credenciales cifradas.
- Catálogo administrable de modelos.
- Preferencias por agente/proyecto y recomendador ponderado.

Consulta [`docs/BUILD_STATUS.md`](docs/BUILD_STATUS.md) para ver el avance y los
siguientes bloques.

## Desarrollo local

Crea `.env.local` a partir de `.env.example`, configura Supabase y agrega una
clave de cifrado exclusiva del servidor:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

```env
NEXUS_CREDENTIAL_ENCRYPTION_KEY=TU_CLAVE_BASE64
```

Después ejecuta:

```bash
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

## Validación

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

## Migraciones

Ejecuta las migraciones de `supabase/migrations` en orden. No publiques
`.env.local`, claves privadas, tokens de proveedores ni la clave maestra de
cifrado.
