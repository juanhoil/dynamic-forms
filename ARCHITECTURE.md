# Arquitectura del Proyecto RJSF Playground

## 📐 Visión General

Este documento explica la arquitectura y el diseño del proyecto RJSF Playground, un proyecto educativo que demuestra el uso de react-jsonschema-form.

## 🏛️ Principios de Diseño

### 1. Separación de Responsabilidades

El proyecto está organizado en capas lógicas:

```
src/
├── components/     # Componentes UI reutilizables
├── layouts/        # Layouts de página con lógica compleja
├── examples/       # Páginas/ejemplos específicos
└── styles/         # Estilos globales
```

### 2. Reutilización de Código

El componente `FormPlayground` encapsula toda la funcionalidad común:
- Editores de schemas
- Renderizado del formulario
- Visualización de formData
- Validación de JSON

Esto permite crear nuevos ejemplos simplemente pasando diferentes schemas como props.

### 3. Estado Unidireccional

Flujo de datos React estándar:
```
JSON Editor → Validación → State Update → Re-render Form
     ↓
formData → Update → Display JSON
```

## 🧩 Componentes Principales

### App.jsx - Componente Raíz

**Responsabilidad:** Configuración de routing y estructura general

```jsx
<Router>
  <Navbar />
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/example1" element={<Example1 />} />
    <Route path="/example2" element={<Example2 />} />
  </Routes>
</Router>
```

**Decisiones de diseño:**
- BrowserRouter para URLs limpias
- Navbar fuera de Routes para que aparezca en todas las páginas
- Rutas simples y descriptivas

### Navbar.jsx - Navegación

**Responsabilidad:** Proporcionar navegación consistente

**Características:**
- Usa `NavLink` para resaltado automático de ruta activa
- Responsive (se adapta a móviles)
- Estilos centralizados en CSS

### FormPlayground.jsx - Layout Principal

**Responsabilidad:** Gestionar la interacción entre schemas y formulario

**Estado interno:**
```javascript
const [schema, setSchema] = useState(initialSchema);
const [uiSchema, setUiSchema] = useState(initialUiSchema);
const [formData, setFormData] = useState(initialFormData);
const [schemaText, setSchemaText] = useState('...');
const [uiSchemaText, setUiSchemaText] = useState('...');
const [schemaError, setSchemaError] = useState('');
const [uiSchemaError, setUiSchemaError] = useState('');
```

**Flujo de actualización:**

1. Usuario edita textarea → `handleSchemaChange`
2. Intenta parsear JSON → `JSON.parse()`
3. Si válido → Actualiza `schema` state
4. React re-renderiza → Form se actualiza
5. Si inválido → Muestra error, no actualiza schema

**Por qué dos estados para schema?**
- `schemaText`: String editable (lo que ve el usuario)
- `schema`: Objeto parseado (lo que usa el Form)
- Esto permite mostrar JSON inválido mientras se edita sin romper el formulario

### Example1.jsx - Ejemplo de Tipos

**Responsabilidad:** Demostrar todos los tipos de campos

**Estructura:**
```javascript
const schema = { /* JSON Schema completo */ };
const uiSchema = { /* Personalizaciones UI */ };
const initialFormData = { /* Valores iniciales */ };

return (
  <FormPlayground
    title="..."
    description="..."
    initialSchema={schema}
    initialUiSchema={uiSchema}
    initialFormData={initialFormData}
    onSubmit={handleSubmit}
  />
);
```

**Tipos demostrados:**
- Primitivos: string, number, boolean
- Formatos: email, date, date-time, password
- Widgets: text, textarea, select, radio, checkbox, range
- Arrays: intereses con checkboxes múltiples
- Validaciones: required, minLength, maxLength, min, max, pattern

### Example2.jsx - Consumo de API

**Responsabilidad:** Demostrar integración con API externa

**Ciclo de vida:**

```
1. useEffect → fetchPlans()
      ↓
2. setLoading(true)
      ↓
3. fetch(API_URL)
      ↓
4. setPlans(data) + setLoading(false)
      ↓
5. Construir schema dinámico
      ↓
6. Renderizar FormPlayground
```

**Manejo de estados:**
- **Loading**: Muestra mensaje de carga
- **Error**: Muestra error + botón de reintentar
- **Success**: Renderiza formulario con datos

**Mapeo de API a Schema:**
```javascript
planId: {
  type: 'string',
  enum: plans.map(plan => plan.id.toString()),     // Valores guardados
  enumNames: plans.map(plan => plan.nombre)        // Valores mostrados
}
```

Este patrón permite:
- Usuario ve nombres legibles
- FormData guarda solo IDs (eficiente)
- Fácil lookup posterior: `plans.find(p => p.id === formData.planId)`

## 🔄 Flujo de Datos

### Flujo de Edición de Schema

```
Usuario escribe en textarea
        ↓
onChange → handleSchemaChange
        ↓
setSchemaText (actualiza textarea)
        ↓
JSON.parse intenta parsear
        ↓
    ┌─────┴─────┐
    ↓           ↓
  Válido    Inválido
    ↓           ↓
setSchema   setSchemaError
    ↓
Form re-renderiza
    ↓
Formulario actualizado
```

### Flujo de Edición de Formulario

```
Usuario interactúa con campo
        ↓
onChange event
        ↓
handleFormChange({ formData })
        ↓
setFormData(formData)
        ↓
Re-render de JSON output
```

### Flujo de Submit

```
Usuario hace click en Submit
        ↓
onSubmit({ formData })
        ↓
Validación automática de RJSF
        ↓
    ┌─────┴─────┐
    ↓           ↓
  Válido    Inválido
    ↓           ↓
handleSubmit  Muestra errores
```

## 🎨 Estrategia de Estilos

### Global vs Component Styles

**Decision:** Usar CSS global en lugar de CSS Modules o styled-components

**Razones:**
- Proyecto educativo simple
- Evitar dependencias innecesarias
- Facilita el aprendizaje para principiantes
- Todos los estilos en un solo archivo

### Nomenclatura de Clases

Patrón BEM simplificado:
```css
.navbar
.navbar-content
.navbar-title
.navbar-links

.panel
.panel-title

.json-editor
.editor-container
.editor-group
```

### Responsive Design

Estrategia mobile-first con media queries:

```css
/* Desktop first (por defecto) */
.playground-container {
  grid-template-columns: 1fr 1fr;
}

/* Mobile */
@media (max-width: 968px) {
  .playground-container {
    grid-template-columns: 1fr;
  }
}
```

## 🔧 Decisiones Técnicas

### ¿Por qué Vite?

- **Rapidez**: HMR instantáneo durante desarrollo
- **Simplicidad**: Configuración mínima
- **Moderno**: ES modules nativos
- **Build optimizado**: Rollup para producción

### ¿Por qué Material-UI Theme?

- **Profesional**: Componentes bien diseñados
- **Accesibilidad**: ARIA labels automáticos
- **Validación visual**: Mensajes de error integrados
- **Responsive**: Funciona bien en móviles

### ¿Por qué React Router?

- **Estándar**: Solución de routing más popular
- **NavLink**: Resaltado automático de ruta activa
- **Declarativo**: Fácil de entender y mantener

## 📊 Estructura de Datos

### JSON Schema (Example 1)

```json
{
  "title": "Título del formulario",
  "type": "object",
  "required": ["campo1", "campo2"],
  "properties": {
    "campo1": {
      "type": "string",
      "title": "Etiqueta visible",
      "description": "Texto de ayuda",
      "minLength": 3,
      "maxLength": 50
    }
  }
}
```

### UI Schema

```json
{
  "campo1": {
    "ui:widget": "textarea",
    "ui:placeholder": "Placeholder texto",
    "ui:options": {
      "rows": 5
    }
  }
}
```

### Form Data

```json
{
  "campo1": "valor ingresado",
  "campo2": 42
}
```

## 🚀 Optimizaciones

### 1. Validación de JSON sin Romper UI

En lugar de crashear cuando hay JSON inválido:
```javascript
try {
  const parsed = JSON.parse(value);
  setSchema(parsed);
  setSchemaError('');
} catch (err) {
  setSchemaError(err.message);
  // No actualiza schema, mantiene el anterior válido
}
```

### 2. Fetch Único con useEffect

```javascript
useEffect(() => {
  fetchPlans();
}, []); // Array vacío = ejecuta solo al montar
```

### 3. Responsive con CSS Grid

Grid layout que se adapta automáticamente:
```css
.playground-container {
  display: grid;
  grid-template-columns: 1fr 1fr; /* Desktop */
  gap: 1.5rem;
}

@media (max-width: 968px) {
  .playground-container {
    grid-template-columns: 1fr; /* Mobile: stack vertical */
  }
}
```

## 🧪 Patrones de React

### 1. Controlled Components

Todos los inputs están controlados por React state:
```javascript
<textarea
  value={schemaText}
  onChange={handleSchemaChange}
/>
```

### 2. Lifting State Up

FormPlayground gestiona todo el estado y lo pasa al Form de RJSF:
```javascript
<Form
  schema={schema}
  formData={formData}
  onChange={handleFormChange}
/>
```

### 3. Props Drilling

Datos fluyen de arriba hacia abajo:
```
Example1 → initialSchema → FormPlayground → schema → Form
```

### 4. Composition

FormPlayground es un contenedor que acepta cualquier schema:
```javascript
<FormPlayground
  initialSchema={schemaPersonalizado}
  initialUiSchema={uiSchemaPersonalizado}
/>
```

## 📈 Escalabilidad

### Para agregar un nuevo ejemplo:

1. Crear archivo en `src/examples/Example3.jsx`
2. Definir schema y uiSchema
3. Usar FormPlayground
4. Agregar ruta en App.jsx
5. Agregar link en Navbar.jsx

### Para agregar nueva funcionalidad común:

1. Modificar FormPlayground.jsx
2. Todos los ejemplos heredan la funcionalidad automáticamente

### Para personalizar un ejemplo específico:

1. Usar el prop `onSubmit` para lógica custom
2. Pasar `initialFormData` diferente
3. Customizar uiSchema

## 🔐 Consideraciones de Seguridad

### Validación de JSON

- Usa `try/catch` para prevenir crashes
- No ejecuta código del JSON (solo parse)
- Valida schema con AJV antes de usar

### API Calls

- Maneja errores de red
- No expone credenciales (API pública)
- Timeout implícito del navegador

### XSS Prevention

- React escapa valores automáticamente
- No usa `dangerouslySetInnerHTML`
- JSON.stringify previene inyección

## 📚 Recursos de Aprendizaje

### Conceptos de React usados:
- useState
- useEffect
- Controlled components
- Props
- Component composition
- Conditional rendering

### Conceptos de RJSF:
- JSON Schema
- UI Schema
- Validators
- Widgets
- Custom submit handlers

### Conceptos de CSS:
- Grid layout
- Flexbox
- Media queries
- BEM naming

---

Esta arquitectura prioriza **simplicidad, claridad y propósito educativo** sobre optimizaciones prematuras o abstracciones complejas.
