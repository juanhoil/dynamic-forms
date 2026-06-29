# jsonSchemaBuilder

Carpeta autocontenida con las funcionalidades principales para **editar**, **visualizar** e **inferir** JSON Schemas. Pensada para copiarse tal cual a otro proyecto React.

## Contenido

| Archivo | Descripción |
| --- | --- |
| `JsonSchemaBuilder.tsx` | Componente principal de doble panel: editor visual (`CustomJsonSchema`) a la izquierda y visualizador/editor JSON (`JsonSchemaVisualizer`) a la derecha, sincronizados de forma bidireccional. Soporta modo editable / solo lectura. |
| `CustomJsonSchema.tsx` | Editor/visualizador del schema. Permite crear schemas de tipo `object` / `array`, editarlos con `SchemaVisualEditor`, **inferir** un schema desde un ejemplo con `SchemaInferencer`, y limpiar el schema. Tiene modo `readonly`. |
| `JsonSchemaFields.tsx` | Vista compacta de solo lectura de los campos del schema (nombre, tipo y si es requerido) usando badges. |
| `Button.tsx` | Botón base reutilizado por los componentes. |
| `VariableBadge.tsx` | Badge de color usado para mostrar tipos/etiquetas. |
| `index.ts` | Barrel de exportaciones. |

## Dependencias externas

Instalar en el proyecto destino:

```bash
npm install jsonjoy-builder lucide-react
```

Versiones de referencia usadas en este proyecto:

- `jsonjoy-builder` ^0.3.2
- `lucide-react` ^0.562.0
- `react` ^19.1.1

### Estilos

- Los componentes usan **Tailwind CSS v4** (clases utilitarias y sintaxis `bg-blue-50!`, `color-mix(...)`, etc.). El proyecto destino debe tener Tailwind configurado.
- `JsonSchemaBuilder.tsx` importa los estilos del paquete: `import "jsonjoy-builder/styles.css";`.

## Uso

### Builder completo (editar + visualizar + inferir)

```tsx
import { useState } from 'react';
import { JsonSchemaBuilder } from '@/components/jsonSchemaBuilder';

function Example() {
  const [schema, setSchema] = useState<any>(null);

  return (
    <JsonSchemaBuilder
      schema={schema}
      setSchema={setSchema}
      editable={true}
    />
  );
}
```

### Solo visualización del schema (read-only)

```tsx
import { CustomJsonSchema } from '@/components/jsonSchemaBuilder';

<CustomJsonSchema schema={schema} readonly />
```

### Lista compacta de campos

```tsx
import { JsonSchemaFields } from '@/components/jsonSchemaBuilder';

<JsonSchemaFields schema={schema} />
```

## Props

### `JsonSchemaBuilder`

| Prop | Tipo | Default | Descripción |
| --- | --- | --- | --- |
| `schema` | `any` | — | JSON Schema controlado. |
| `setSchema` | `(schema: any) => void` | — | Callback al cambiar el schema (ya limpia `description` vacíos). |
| `editable` | `boolean` | `true` | Si es `false`, ambos paneles quedan en solo lectura. |

### `CustomJsonSchema`

| Prop | Tipo | Default | Descripción |
| --- | --- | --- | --- |
| `schema` | `any` | — | JSON Schema. |
| `onChange` | `(schema: any) => void` | — | Callback al editar/inferir/limpiar. |
| `readonly` | `boolean` | `false` | Oculta acciones de edición e inferencia. |

### `JsonSchemaFields`

| Prop | Tipo | Default | Descripción |
| --- | --- | --- | --- |
| `schema` | `any` | — | JSON Schema. |
| `showLabel` | `boolean` | `true` | Muestra la etiqueta "JSON Schema:" y el badge del tipo raíz. |
