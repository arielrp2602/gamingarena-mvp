# GamingArena

Plataforma de torneos de videojuegos y TCG (Trading Card Games) que conecta tiendas organizadoras, jugadores y jueces. Permite crear torneos competitivos y casuales con sistema de brackets suizo, pagos integrados, chat en tiempo real y verificación de decklists.

---

## Arquitectura

```
gamingarena/
├── apps/
│   ├── api/          # Backend — NestJS REST API
│   └── web/          # Frontend — Next.js App Router
└── package.json      # Workspace root
```

El proyecto es un monorepo con dos aplicaciones independientes que comparten el `node_modules` raíz.

---

## Backend — `apps/api`

API REST construida con **NestJS 11** sobre **Node.js**. Arquitectura modular con 25 módulos de dominio.

### Tecnologías y librerías

| Categoría | Librería | Versión | Uso |
|---|---|---|---|
| **Framework** | `@nestjs/core` | ^11.0 | Framework principal |
| **ORM** | `prisma` / `@prisma/client` | ^7.7 | Acceso a base de datos |
| **Base de datos** | PostgreSQL (Neon) | — | Base de datos principal (serverless) |
| **Adapter DB** | `@prisma/adapter-pg` | ^7.7 | Adapter pg para Prisma v7 |
| **Autenticación** | `@nestjs/jwt` + `@nestjs/passport` | ^11.0 | Tokens JWT en cookies httpOnly |
| **Estrategia JWT** | `passport-jwt` | ^4.0 | Extracción de JWT desde cookie |
| **Hashing** | `bcrypt` | ^6.0 | Hash de contraseñas |
| **Configuración** | `@nestjs/config` | ^4.0 | Variables de entorno |
| **Validación** | `class-validator` + `class-transformer` | ^0.15 / ^0.5 | Validación de DTOs |
| **WebSockets** | `@nestjs/websockets` + `@nestjs/platform-socket.io` | ^11.0 | Chat en tiempo real |
| **Socket.io** | `socket.io` | ^4.8 | Servidor WebSocket |
| **Pagos** | `stripe` | ^17.7 | Stripe Connect para inscripciones |
| **Emails** | `resend` | ^4.5 | Envío de correos transaccionales |
| **Discord** | `discord.js` | ^14.18 | Integración con servidores Discord |
| **Tareas cron** | `@nestjs/schedule` | ^6.0 | Cierre automático de rondas expiradas |
| **Rate limiting** | `@nestjs/throttler` | ^6.4 | Protección contra abuso de endpoints |
| **Cookies** | `cookie-parser` | ^1.4 | Parseo de cookies en Express |
| **HTTP Events** | `@nestjs/event-emitter` | ^3.0 | Eventos internos entre módulos |
| **Monitoreo** | `@sentry/node` | ^10.50 | Tracking de errores en producción |

### Módulos de dominio

`auth` · `users` · `jugador` · `tienda` · `juez` · `torneos` · `inscripciones` · `rondas` · `partidas` · `resultados` · `brackets` · `disputas` · `deck-check` · `pagos` · `premios` · `formatos` · `juegos` · `personajes` · `notificaciones` · `emails` · `discord` · `feedback` · `common`

### Testing

| Librería | Uso |
|---|---|
| `jest` ^30 | Runner de tests |
| `ts-jest` ^29 | Transformador TypeScript |
| `@nestjs/testing` ^11 | Módulo de testing de NestJS |
| `supertest` ^7 | Tests E2E de endpoints HTTP |

---

## Frontend — `apps/web`

Aplicación web construida con **Next.js 15** usando el **App Router** y **React 19**.

### Tecnologías y librerías

| Categoría | Librería | Versión | Uso |
|---|---|---|---|
| **Framework** | `next` | ^15.3 | Framework React con SSR / RSC |
| **UI base** | `react` + `react-dom` | ^19.1 | Biblioteca de UI |
| **Estilos** | `tailwindcss` | ^4 | Utility-first CSS |
| **Componentes** | `shadcn` (radix primitives) | ^4.6 | Componentes accesibles (Dialog, Select, Tabs…) |
| **Variantes CSS** | `class-variance-authority` | ^0.7 | Variantes tipadas de componentes |
| **Merge clases** | `clsx` + `tailwind-merge` | ^2.1 / ^3.5 | Combinación segura de clases Tailwind |
| **Animaciones** | `tw-animate-css` | ^1.4 | Animaciones CSS con Tailwind |
| **Iconos** | `lucide-react` | ^1.14 | Iconos SVG como componentes React |
| **Estado global** | `zustand` | ^5.0 | Store de autenticación y sesión |
| **Server state** | `@tanstack/react-query` | ^5.74 | Caché, refetch y sincronización de datos del servidor |
| **Formularios** | `react-hook-form` | ^7.73 | Gestión de formularios con validación |
| **Validación** | `zod` | ^4.3 | Schemas de validación + inferencia de tipos |
| **Resolver** | `@hookform/resolvers` | ^5.2 | Integración RHF ↔ Zod |
| **HTTP client** | `axios` | ^1.15 | Llamadas a la API REST |
| **WebSockets** | `socket.io-client` | ^4.8 | Chat en tiempo real en sala de partida |
| **Pagos** | `@stripe/react-stripe-js` + `@stripe/stripe-js` | ^3.7 / ^5.7 | Formulario de pago con Stripe Elements |
| **Temas** | `next-themes` | ^0.4 | Modo claro / oscuro |
| **Onboarding** | `driver.js` | ^1.3 | Tour guiado de primera vez |
| **Base UI** | `@base-ui/react` | ^1.0 | Primitivas headless adicionales |
| **Monitoreo** | `@sentry/nextjs` | ^10.50 | Tracking de errores en producción |

### Testing

| Librería | Uso |
|---|---|
| `jest` ^30 | Runner de tests |
| `ts-jest` ^29 | Transformador TypeScript |
| `jest-environment-jsdom` ^30 | Entorno DOM para tests de componentes |
| `@testing-library/react` ^16 | Utilidades para testear componentes React |
| `@testing-library/jest-dom` ^6 | Matchers adicionales de DOM |

---

## Base de datos

El schema Prisma define los siguientes modelos principales:

`User` · `JugadorProfile` · `TiendaProfile` · `JuezProfile` · `Juego` · `FormatoJuego` · `FormatoTienda` · `Personaje` · `Torneo` · `TorneoJuez` · `Inscripcion` · `Ronda` · `Partida` · `Resultado` · `Disputa` · `DeckCheck` · `Pago` · `Premio` · `Notificacion` · `Mensaje` · `Expulsion` · `Feedback`

---

## Requisitos

- Node.js >= 20
- npm >= 10
- PostgreSQL (o cuenta en [Neon](https://neon.tech))
- Cuenta de [Stripe](https://stripe.com) (para pagos)
- Cuenta de [Resend](https://resend.com) (para emails)

---

## Instalación

```bash
# Instalar dependencias (desde la raíz del monorepo)
npm install

# Configurar variables de entorno
cp apps/api/.env.example apps/api/.env
# Editar apps/api/.env con tus credenciales

# Generar el cliente de Prisma
cd apps/api && npm run db:generate

# Ejecutar migraciones
npm run db:migrate

# (Opcional) Poblar datos de ejemplo
npm run db:seed
```

---

## Desarrollo

```bash
# Iniciar la API (puerto 3001)
cd apps/api && npm run dev

# Iniciar el frontend (puerto 3000)
cd apps/web && npm run dev
```

---

## Tests

```bash
# Tests unitarios — API
cd apps/api && npm test

# Tests con cobertura — API
cd apps/api && npm run test:cov

# Tests E2E — API
cd apps/api && npm run test:e2e

# Tests unitarios — Web
cd apps/web && npm test
```

---

## Variables de entorno

### `apps/api/.env`

```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_EXPIRES_IN=5h
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
DISCORD_REDIRECT_URI=http://localhost:3001/auth/discord/callback
SENTRY_DSN=...
```

### `apps/web/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_SENTRY_DSN=...
```
