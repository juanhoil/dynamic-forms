# hyperschema-engine

Utilerías del **motor de resolución de JSON HyperSchema**, portadas desde el
frontend (`src/examples/forms/example8`) para poder ejecutarse en un backend.
Son módulos TypeScript puros (ESM), **sin React** ni dependencias de UI.

El motor toma un `JsonHyperSchema` (un JSON Schema con un array `links`) más los
datos del formulario, ejecuta los links contra sus APIs (red real y/o mock),
aplica los `responseMapping` sobre el schema/data y devuelve el resultado ya
resuelto.

## Requisitos

- Node.js **>= 20.19** (por `@marcbachmann/cel-js`, que es ESM y usa `fetch`
  global de Node).

## Instalación

```bash
cd backend
npm install        # o pnpm install
npm run build      # compila a dist/
npm start          # arranca la API NestJS (http://localhost:3000/api)
npm run start:dev  # modo watch con tsx
```

El puerto se configura con la variable de entorno `PORT` (default `3000`).

## Contenido

Dos capas: el **motor puro** (utilerías, sin framework) y una **API NestJS**
delgada que lo expone por HTTP (sin base de datos: el schema viaja en el body).

**Motor (utilerías)**

| Módulo | Qué hace |
| --- | --- |
| `services/hyperSchemaResolver.ts` | Motor: resuelve links por rol (`init`, `catalog`, `dependent`, `submit`), aplica mappings y lógica `allOf`/`if-then-else`. |
| `services/mockService.ts` | Resuelve un link: red real con fallback a mock, `mock-only` o `real-only`. |
| `utils/templateEngine.ts` | Motor de plantillas `{{ expr }}` con CEL. |
| `utils/buildRequest.ts` | Convierte `request` + valores en `{ method, url, data, headers }`. |
| `utils/pointer.ts` | Helpers de acceso/escritura por pointer y clonado. |
| `types.ts` | Tipos (`JsonHyperSchema`, `HyperSchemaLink`, ...) autocontenidos. |

**API NestJS**

| Módulo | Qué hace |
| --- | --- |
| `main.ts` | Bootstrap (ValidationPipe global, CORS, prefijo `/api`). |
| `app.module.ts` | Módulo raíz. |
| `forms/forms.controller.ts` | Endpoints HTTP. |
| `forms/forms.service.ts` | Provider que envuelve el motor (punto único para inyectar red/allowlist). |
| `forms/dto/resolve-form.dto.ts` | DTOs validados con `class-validator`. |

## API HTTP

Todos los endpoints reciben el `hyperSchema` en el body (stateless).

| Método | Ruta | Rol(es) | Momento |
| --- | --- | --- | --- |
| `POST` | `/api/forms/init` | `init` + `catalog` | carga inicial del form |
| `POST` | `/api/forms/dependent` | `dependent` | al cambiar campos (el debounce lo pone el cliente) |
| `POST` | `/api/forms/submit` | `submit` | envío |
| `POST` | `/api/forms/resolve` | `body.roles` | genérico |

Body:

```jsonc
{
  "hyperSchema": { "type": "object", "properties": { ... }, "links": [ ... ] },
  "formData": {},              // opcional
  "useTestValues": false,      // opcional: usa los testValues del schema
  "values": {},                // opcional: variables externas (tokens, api keys)
  "roles": ["init", "catalog"] // solo en /resolve
}
```

Respuesta:

```jsonc
{
  "schema": { /* JSON Schema sin links, listo para RJSF */ },
  "formData": { /* data tras aplicar los mappings */ },
  "warnings": [ /* variables externas faltantes */ ]
}
```

## Uso

```ts
import { resolveLinks, resolveInitial, resolveSubmit } from 'hyperschema-engine';

// Carga inicial (roles init + catalog): rellena enums/defaults desde catálogos.
const { schemaWithoutLinks, data, warnings } = await resolveInitial(hyperSchema, {});

// Resolver roles concretos:
const result = await resolveLinks(hyperSchema, formData, ['dependent'], {
  useTestValues: false,          // true = usa los testValues declarados en cada link
  values: { apiKey: '...' },      // variables externas de runtime
});

// Envío (rol submit):
await resolveSubmit(hyperSchema, formData, { values: { token } });
```

### Opciones (`ResolveOptions`)

- `service`: servicio de resolución de links. Por defecto: red real con
  fallback a mock. Puedes inyectar el tuyo o uno de `createMockService(...)`.
- `useTestValues` (default `false`): usa los `testValues`/`valueTest` de cada
  link en lugar de llamar a la red.
- `values`: variables externas de runtime que se combinan con `formData` al
  renderizar URLs/headers/body.

### Resultado (`ResolveResult`)

- `data`: datos del formulario tras aplicar los mappings.
- `schema`: schema resuelto (con `links`).
- `schemaWithoutLinks`: schema listo para entregar a un renderer de formularios.
- `warnings`: avisos de variables externas faltantes.

## Notas sobre el port

Este paquete contiene la **lógica pura** del hook `useJsonHyperSchema` más una
capa NestJS delgada. La parte reactiva del frontend (efectos, debounce de links
`dependent`, estado de `loading`) no aplica en backend: aquí cada rol se
resuelve mediante una llamada directa y sin estado a `resolveLinks`.

**Sin persistencia (por diseño).** No hay base de datos: el `hyperSchema` viaja
en el body de cada request. Si más adelante quieres guardar las configuraciones
(p. ej. en MongoDB), basta con añadir un módulo de persistencia y que el
controller lea el schema por `id`/`slug` en vez de recibirlo en el body; el
`FormsService` (motor) no cambia.

**Seguridad (SSRF).** Los `links` guardan URLs arbitrarias y el motor hace
`fetch` saliente. Si los schemas provienen de usuarios, inyecta un `service`
propio (`createMockService` con un `realFetcher` que valide contra una allowlist
de dominios y aplique timeout) desde `FormsService`. Nunca guardes secretos en
el schema: pásalos por `values`.
