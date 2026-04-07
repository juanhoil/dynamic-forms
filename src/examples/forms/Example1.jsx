import React from 'react';
import FormPlayground from '../../layouts/FormPlayground';

/**
 * Example 1: All Field Types
 *
 * Demonstrates the most common field types supported by RJSF:
 * - text input
 * - number
 * - textarea
 * - select (dropdown)
 * - checkbox (boolean)
 * - radio buttons (enum)
 * - date
 * - date-time
 * - email
 * - password
 *
 * Includes basic validations and clear labels/descriptions
 */

const schema = {
  title: 'Formulario Completo - Todos los Tipos',
  type: 'object',
  required: ['nombre', 'email', 'edad'],
  properties: {
    // Text input
    nombre: {
      type: 'string',
      title: 'Nombre Completo',
      description: 'Ingresa tu nombre completo',
      minLength: 3,
      maxLength: 50
    },

    // Email
    email: {
      type: 'string',
      title: 'Correo Electrónico',
      description: 'Correo válido (ej: usuario@ejemplo.com)',
      format: 'email'
    },

    // Password
    password: {
      type: 'string',
      title: 'Contraseña',
      description: 'Mínimo 8 caracteres',
      minLength: 8
    },

    // Number
    edad: {
      type: 'number',
      title: 'Edad',
      description: 'Edad en años (18-100)',
      minimum: 18,
      maximum: 100
    },

    // Textarea
    biografia: {
      type: 'string',
      title: 'Biografía',
      description: 'Cuéntanos sobre ti (máximo 500 caracteres)',
      maxLength: 500
    },

    // Select (dropdown)
    pais: {
      type: 'string',
      title: 'País',
      description: 'Selecciona tu país de residencia',
      enum: ['mexico', 'españa', 'argentina', 'colombia', 'chile'],
      enumNames: ['México', 'España', 'Argentina', 'Colombia', 'Chile']
    },

    // Radio buttons
    genero: {
      type: 'string',
      title: 'Género',
      description: 'Selecciona una opción',
      enum: ['masculino', 'femenino', 'otro', 'prefiero_no_decir'],
      enumNames: ['Masculino', 'Femenino', 'Otro', 'Prefiero no decir']
    },

    // Checkbox (boolean)
    aceptaTerminos: {
      type: 'boolean',
      title: 'Acepto los términos y condiciones',
      description: 'Debes aceptar para continuar'
    },

    // Date
    fechaNacimiento: {
      type: 'string',
      title: 'Fecha de Nacimiento',
      description: 'Selecciona tu fecha de nacimiento',
      format: 'date'
    },

    // Date-time
    fechaRegistro: {
      type: 'string',
      title: 'Fecha y Hora de Registro',
      description: 'Fecha y hora exacta',
      format: 'date-time'
    },

    // Multiple checkboxes (array with uniqueItems)
    intereses: {
      type: 'array',
      title: 'Intereses',
      description: 'Selecciona tus áreas de interés',
      uniqueItems: true,
      items: {
        type: 'string',
        enum: [
          'tecnologia',
          'deportes',
          'musica',
          'arte',
          'ciencia',
          'viajes'
        ],
        enumNames: [
          'Tecnología',
          'Deportes',
          'Música',
          'Arte',
          'Ciencia',
          'Viajes'
        ]
      }
    },

    // Number with range
    nivelSatisfaccion: {
      type: 'number',
      title: 'Nivel de Satisfacción',
      description: 'Califica del 1 al 10',
      minimum: 1,
      maximum: 10,
      default: 5
    }
  }
};

const uiSchema = {
  // Text input - default widget
  nombre: {
    'ui:placeholder': 'Ej: Juan Pérez'
  },

  // Email - default widget
  email: {
    'ui:placeholder': 'tu@email.com'
  },

  // Password - use password widget
  password: {
    'ui:widget': 'password',
    'ui:placeholder': 'Mínimo 8 caracteres'
  },

  // Number - default widget
  edad: {
    'ui:placeholder': 'Ej: 25'
  },

  // Textarea - use textarea widget
  biografia: {
    'ui:widget': 'textarea',
    'ui:placeholder': 'Escribe algo sobre ti...',
    'ui:options': {
      rows: 5
    }
  },

  // Select - default widget for enum
  pais: {
    'ui:placeholder': 'Selecciona un país'
  },

  // Radio buttons - use radio widget
  genero: {
    'ui:widget': 'radio'
  },

  // Checkbox - default for boolean
  aceptaTerminos: {},

  // Date - default widget for format: date
  fechaNacimiento: {},

  // Date-time - default widget for format: date-time
  fechaRegistro: {},

  // Multiple checkboxes - use checkboxes widget
  intereses: {
    'ui:widget': 'checkboxes'
  },

  // Range slider for number
  nivelSatisfaccion: {
    'ui:widget': 'range'
  }
};

const initialFormData = {
  nombre: '',
  email: '',
  edad: 25,
  biografia: '',
  aceptaTerminos: false,
  nivelSatisfaccion: 5,
  intereses: []
};

const Example1 = () => {
  const handleSubmit = (formData) => {
    alert('Formulario enviado:\n' + JSON.stringify(formData, null, 2));
  };

  return (
    <FormPlayground
      title="Ejemplo 1: Todos los Tipos de Campos"
      description="Este ejemplo muestra todos los tipos de campos soportados por RJSF: texto, número, textarea, select, checkbox, radio, date, date-time, email, password, y más. Puedes editar el JSON Schema y UI Schema para experimentar."
      initialSchema={schema}
      initialUiSchema={uiSchema}
      initialFormData={initialFormData}
      onSubmit={handleSubmit}
    />
  );
};

export default Example1;
