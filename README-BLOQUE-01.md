# NEXUS AI Office — Bloque 01

Este paquete contiene la identidad visual, autenticación, onboarding, dashboard
protegido y la primera migración de Supabase.

## 1. Copiar archivos

Extrae el contenido del paquete en la raíz de `nexus-ai-office` y permite
reemplazar los archivos existentes.

El paquete no incluye:

- `node_modules`
- `.next`
- `package-lock.json`
- `.env.local`
- claves de Supabase

## 2. Instalar y validar dependencias

```powershell
npm install
```

No es necesario ejecutar otra vez `shadcn init`.

## 3. Configurar variables

Copia `.env.example` como `.env.local`:

```powershell
Copy-Item .env.example .env.local
```

Completa:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_TU_CLAVE
```

No utilices la `service_role` en `.env.local`.

## 4. Ejecutar la migración

En Supabase abre `SQL Editor`, crea una consulta y pega el contenido completo de:

```text
supabase/migrations/202607260001_foundation.sql
```

Ejecuta la consulta una sola vez. Debe terminar sin errores.

## 5. Configurar las URL de Auth

En Supabase abre:

```text
Authentication → URL Configuration
```

Configura:

```text
Site URL:
http://localhost:3000

Redirect URL:
http://localhost:3000/auth/callback
```

La pantalla admite dos modalidades:

- Plantilla estándar de Supabase: el usuario abre el enlace.
- Plantilla con OTP: el usuario escribe seis dígitos en `/confirmar`.

Para utilizar código, la plantilla de confirmación debe incluir `{{ .Token }}`.

## 6. Verificación técnica

```powershell
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Si todo termina correctamente:

```powershell
npm run dev
```

## 7. Prueba funcional

1. Visita `http://localhost:3000`.
2. Abre `Crear mi oficina`.
3. Registra una cuenta real.
4. Confirma el correo.
5. Nombra la oficina.
6. Verifica que llegas a `/app`.
7. Cierra sesión e inicia nuevamente.

No ejecutes `npm audit fix --force`. Primero revisaremos por separado si los
avisos pertenecen a dependencias de producción o herramientas de desarrollo.
