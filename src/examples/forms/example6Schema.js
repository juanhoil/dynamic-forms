const schema = {
  title: 'Formulario de Contacto',
  type: 'object',
  required: ['nombre', 'email'],
  properties: {
    nombre: {
      type: 'string',
      title: 'Nombre Completo',
    },
    email: {
      type: 'string',
      title: 'Correo Electrónico',
      format: 'email',
    },
    telefono: {
      type: 'string',
      title: 'Teléfono',
    },
    mensaje: {
      type: 'string',
      title: 'Mensaje',
    },
    comprobanteDomicilio: {
      type: 'string',
      title: 'Comprobante de Domicilio',
      format: 'data-url',
    },
  },
};

const uiSchema = {
  nombre: {
    'ui:autofocus': true,
    'ui:placeholder': 'Ingresa tu nombre completo',
  },
  email: {
    'ui:placeholder': 'ejemplo@correo.com',
  },
  telefono: {
    'ui:placeholder': '+52 000 000 0000',
  },
  mensaje: {
    'ui:widget': 'textarea',
    'ui:options': {
      rows: 4,
    },
    'ui:placeholder': 'Escribe tu mensaje aquí...',
  },
  comprobanteDomicilio: {
    //'ui:widget': 'previewModal',
    'ui:options': {
      accept: '.pdf',
    },
  },
  'ui:submitButtonOptions': {
    submitText: 'Guardar',
    props: {
      //variant: 'outlined',
      //color: 'secondary',
      style: { marginTop: '2rem', marginLeft: 'auto', display: 'block' },
    },
  },
};

export const inputValues = {
  nombre: 'Juan Perez',
  email: 'juan.perez@example.com',
  telefono: '1234567890',
  mensaje: 'Hola, este es un mensaje de ejemplo',
  comprobanteDomicilio: 'https://www.google.com/pdf',
};

const httpRequestConfig = {
  url: 'https://api.example.com/submit',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  JSONSchema: {},

};

export const configForm = {
  version: '1.0.0',
  schema: schema,
  uiSchema: uiSchema,
  styles: {
    width: '100%',
    maxWidth: '650px',
  },
  
  inputValues: {
    nombre: 'Juan Perez',
    email: 'juan.perez@example.com',
    telefono: '1234567890',
    mensaje: 'Hola, este es un mensaje de ejemplo',
    comprobanteDomicilio: 'https://www.google.com/pdf',
  },
  outputValues: {
    nombre: 'Juan Perez',
    email: 'juan.perez@example.com',
    telefono: '9995708945',
    mensaje: 'Hola, este es un mensaje de ejemplo',
    comprobanteDomicilio: 'https://www.google.com/pdf',
  },
};