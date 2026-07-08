// ---------------------------------------------------------------------------
// Configuraciones de formulario "guardadas". Simula la persistencia (BD): en
// lugar de que el front envíe el hyperSchema, el backend lo tiene almacenado y
// lo sirve por id (form-config/get/:id, default 1).
//
// Esta config es la misma que exporta el frontend en:
//   src/examples/forms/Example9.tsx  →  export const hyperSchema
// Se replica aquí porque el backend es un proyecto independiente. El front NO
// debe conocer los `links`; solo el JSON Schema del formulario.
// ---------------------------------------------------------------------------

import type { JsonHyperSchema } from '../types.js';

/** Config de un formulario tal como se guarda: schema (hyperSchema) + uiSchema. */
export interface FormConfig {
  schema: JsonHyperSchema;
  uiSchema: Record<string, unknown>;
}

const example9Schema = {
  type: 'object',
  properties: {
    id: { type: 'number', title: 'ID', readOnly: true },
    title: { type: 'string', title: 'Título' },
    body: { type: 'string', title: 'Contenido' },
    userId: { type: 'number', title: 'Usuario ID' },
  },
  required: ['title', 'body', 'userId'],
  links: [
    {
      id: '1',
      name: 'Cargar publicación',
      description: 'Obtiene la publicación a editar',
      dataRole: 'init',
      request: {
        method: 'GET',
        url: 'https://jsonplaceholder.typicode.com/posts/1',
        headers: {
          type: 'object',
          properties: {
            'Content-Type': { type: 'string', default: 'application/json' },
          },
        },
        body: {},
        queryVariables: {},
        externalVariables: {},
        testValues: {},
      },
      response: {
        jsonSchema: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            title: { type: 'string' },
            body: { type: 'string' },
            userId: { type: 'number' },
          },
          required: ['id', 'title', 'body', 'userId'],
        },
        testValues: { id: 1, title: 'foo', body: 'bar', userId: 1 },
        responseMapping: {
          'id.default': '{{id}}',
          'title.default': '{{title}}',
          'body.default': '{{body}}',
          'userId.default': '{{userId}}',
        },
      },
    },
    {
      id: '2',
      name: 'Guardar publicación',
      description: 'Actualiza la publicación con PUT',
      dataRole: 'submit',
      request: {
        method: 'PUT',
        url: 'https://jsonplaceholder.typicode.com/posts/{{id}}',
        headers: {
          type: 'object',
          properties: {
            'Content-Type': {
              type: 'string',
              default: 'application/json; charset=UTF-8',
            },
          },
        },
        body: {
          type: 'object',
          properties: {
            id: { type: 'number', default: '{{id}}' },
            title: { type: 'string', default: '{{title}}' },
            body: { type: 'string', default: '{{body}}' },
            userId: { type: 'number', default: '{{userId}}' },
          },
        },
        queryVariables: {},
        externalVariables: {},
        testValues: { id: 1, title: 'foo', body: 'bar', userId: 1 },
      },
      response: {
        jsonSchema: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            title: { type: 'string' },
            body: { type: 'string' },
            userId: { type: 'number' },
          },
        },
        testValues: { id: 1, title: 'foo', body: 'bar', userId: 1 },
        responseMapping: {},
      },
    },
  ],
} as JsonHyperSchema;

const example9Config: FormConfig = {
  schema: example9Schema,
  uiSchema: {},
};

export const DEFAULT_FORM_CONFIG_ID = '1';

// "Tabla" de configuraciones guardadas, indexadas por id.
export const FORM_CONFIGS: Record<string, FormConfig> = {
  '1': example9Config,
};
