# NEXUS AI Office

Centro personal de desarrollo asistido por IA construido con Next.js,
TypeScript y Supabase. La plataforma administra workspaces, tecnologías,
proyectos y agentes especializados, con aislamiento mediante RLS y una
arquitectura preparada para múltiples proveedores de inteligencia artificial.

## Estado actual

- Autenticación y onboarding funcionales.
- Workspaces protegidos mediante RLS.
- Catálogo de tecnologías.
- Gestión de proyectos y contexto permanente.
- Catálogo de agentes especializados.
- Equipos por proyecto y recomendación inicial por stack.

Consulta [`docs/BUILD_STATUS.md`](docs/BUILD_STATUS.md) para ver el avance y los
siguientes bloques.

## Desarrollo local

Crea `.env.local` a partir de `.env.example` y configura las credenciales
públicas de tu proyecto Supabase. Después ejecuta:

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
`.env.local`, claves privadas ni tokens de proveedores.
