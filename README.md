# RJSF Playground

Proyecto educativo en React + Vite para explorar y aprender **react-jsonschema-form** (RJSF).

## 🚀 Características

- ✅ Editor en vivo de JSON Schema y UI Schema
- ✅ Visualización en tiempo real del formulario generado
- ✅ Muestra formData actualizado dinámicamente
- ✅ Validaciones automáticas basadas en el schema
- ✅ Ejemplos didácticos completos y funcionales
- ✅ Consumo de API externa para poblar selects
- ✅ UI responsive y moderna

## 📦 Instalación

```bash
# Navegar a la carpeta del proyecto
cd rjsf-playground

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Construir para producción
npm run build
```

## 🏗️ Arquitectura del Proyecto

```
rjsf-playground/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   └── Navbar.jsx       # Barra de navegación
│   │
│   ├── layouts/             # Layouts de página
│   │   └── FormPlayground.jsx  # Layout principal con editores
│   │
│   ├── examples/            # Ejemplos de formularios
│   │   ├── Home.jsx         # Página de inicio
│   │   ├── Example1.jsx     # Todos los tipos de campos
│   │   └── Example2.jsx     # Consumo de API
│   │
│   ├── styles/              # Estilos globales
│   │   └── global.css       # CSS global
│   │
│   ├── App.jsx              # Componente raíz con routing
│   └── main.jsx             # Punto de entrada
│
├── index.html               # HTML principal
├── vite.config.js           # Configuración de Vite
└── package.json             # Dependencias y scripts
```

## 🎯 Componentes Principales

### 1. FormPlayground (Layout)

Componente reutilizable que proporciona la funcionalidad común a todos los ejemplos:

- **Panel izquierdo**: Editores de JSON Schema y UI Schema
- **Panel derecho**: Formulario renderizado y visualización de formData
- **Sincronización en tiempo real**: Los cambios en los schemas actualizan el formulario inmediatamente
- **Validación de JSON**: Muestra errores si el JSON no es válido

**Props:**
- `title`: Título de la página
- `description`: Descripción del ejemplo
- `initialSchema`: JSON Schema inicial
- `initialUiSchema`: UI Schema inicial (opcional)
- `initialFormData`: Datos iniciales del formulario (opcional)
- `onSubmit`: Callback para manejar el envío (opcional)

### 2. Navbar

Barra de navegación con enlaces a todos los ejemplos. Utiliza `NavLink` de React Router para resaltar la ruta activa automáticamente.

### 3. Home

Página de inicio con información del proyecto y enlaces a los ejemplos.

## 📋 Ejemplos Incluidos

### Ejemplo 1: Todos los Tipos de Campos

Demuestra el uso de todos los tipos de campos soportados por RJSF:

- **Text input**: Campos de texto simple
- **Number**: Campos numéricos con validación de rango
- **Textarea**: Áreas de texto multilínea
- **Select**: Menús desplegables (dropdown)
- **Checkbox**: Casillas de verificación (boolean)
- **Radio buttons**: Botones de opción
- **Date**: Selector de fecha
- **Date-time**: Selector de fecha y hora
- **Email**: Campo con validación de email
- **Password**: Campo de contraseña
- **Multiple checkboxes**: Array con uniqueItems
- **Range slider**: Slider numérico

**Validaciones incluidas:**
- Campos requeridos
- Longitud mínima/máxima
- Valores mínimos/máximos
- Formatos (email, date, date-time)
- Patrones personalizados

### Ejemplo 2: Consumo de API de Catálogo

Demuestra cómo integrar datos de una API externa:

**API:** `https://axa-portal-backend.tiprotec.com.mx/api/plan`

**Características:**
- Fetch de datos al montar el componente
- Estados de loading y error
- Mapeo dinámico de la respuesta a opciones del select
- Muestra el **nombre** del plan al usuario
- Guarda únicamente el **ID** en formData
- Botón de reintentar en caso de error

**Implementación:**
```javascript
// El select se define completamente vía JSON Schema
planId: {
  type: 'string',
  title: 'Selecciona un Plan',
  enum: plans.map(plan => plan.id.toString()),      // IDs
  enumNames: plans.map(plan => plan.nombre)         // Nombres
}
```

## 🛠️ Tecnologías Utilizadas

- **React 18**: Librería de UI
- **Vite**: Build tool y dev server
- **React Router**: Navegación entre páginas
- **@rjsf/core**: Core de react-jsonschema-form
- **@rjsf/mui**: Theme de Material-UI para RJSF
- **@rjsf/validator-ajv8**: Validador AJV8 para schemas
- **Material-UI (MUI)**: Componentes de UI

## 📚 Cómo Usar RJSF

### 1. JSON Schema Básico

Define la estructura y validaciones del formulario:

```json
{
  "title": "Mi Formulario",
  "type": "object",
  "required": ["nombre", "email"],
  "properties": {
    "nombre": {
      "type": "string",
      "title": "Nombre",
      "minLength": 3
    },
    "email": {
      "type": "string",
      "title": "Email",
      "format": "email"
    }
  }
}
```

### 2. UI Schema (Opcional)

Personaliza la presentación visual:

```json
{
  "nombre": {
    "ui:placeholder": "Ingresa tu nombre"
  },
  "email": {
    "ui:placeholder": "tu@email.com"
  }
}
```

### 3. Renderizar el Formulario

```jsx
import Form from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';

<Form
  schema={schema}
  uiSchema={uiSchema}
  formData={formData}
  validator={validator}
  onChange={({ formData }) => setFormData(formData)}
  onSubmit={({ formData }) => console.log(formData)}
/>
```

## 🎨 Widgets Disponibles

RJSF selecciona automáticamente el widget apropiado basándose en el schema, pero puedes especificarlo manualmente:

- `text` (default para string)
- `textarea`
- `password`
- `email`
- `number` / `updown`
- `range` (slider)
- `select` / `radio` (para enums)
- `checkbox` (para boolean)
- `checkboxes` (para arrays)
- `date`
- `datetime-local`

## 📖 Recursos Adicionales

- [Documentación oficial de RJSF](https://rjsf-team.github.io/react-jsonschema-form/)
- [JSON Schema Specification](https://json-schema.org/)
- [Material-UI Components](https://mui.com/)
- [React Router Docs](https://reactrouter.com/)

## 🤝 Buenas Prácticas Implementadas

1. **Separación de responsabilidades**: Componentes, layouts y ejemplos en carpetas separadas
2. **Reutilización**: FormPlayground es reutilizable para todos los ejemplos
3. **Estado React**: Uso apropiado de useState para sincronización
4. **Manejo de errores**: Validación de JSON y manejo de errores de API
5. **Comentarios**: Código documentado con comentarios JSDoc
6. **Responsive Design**: Layout adaptable a diferentes tamaños de pantalla
7. **Performance**: Uso de useEffect con array de dependencias vacío para fetch único

## 📝 Notas Importantes

- El proyecto usa **ES modules** (`type: "module"` en package.json)
- Los estilos están centralizados en `global.css` para facilitar la personalización
- La validación de schemas se realiza con **AJV8** (JSON Schema draft 2020-12)
- Las rutas usan `BrowserRouter` (requiere configuración del servidor en producción)

## 🚧 Posibles Mejoras Futuras

- [ ] Agregar más ejemplos (arrays anidados, conditional schemas, etc.)
- [ ] Implementar persistencia en localStorage
- [ ] Agregar exportación/importación de schemas
- [ ] Temas personalizables (light/dark mode)
- [ ] Galería de schemas predefinidos
- [ ] Integración con TypeScript

---

**Desarrollado con ❤️ usando React + Vite + RJSF**
