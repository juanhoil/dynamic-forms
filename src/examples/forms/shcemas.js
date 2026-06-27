const shcemaNewDireccion = {
  type: 'object',
  properties: {
    rfc: {
      type: 'string',
      title: 'Nombre',
    },
    CP: {
      type: 'string',
      minLength: 5,
      title: 'Código Postal',
    },
    Estado: {
      type: 'string',
      readOnly: true,
    },
    Ciudad: {
      type: 'string'
    },
    Municipio: {
      type: 'string',
      readOnly: true,
    },
    Colonia: {
      type: 'string',
    },
    planId: {
      type: 'string',
      title: 'Selecciona un Plan',
      description: 'Elige el plan que mejor se adapte a tus necesidades',
    },
    polizaId: {
      type: 'string',
      title: 'Selecciona una Poliza',
      description: 'Elige la poliza que mejor se adapte a tus necesidades',
    },
  },
  required: ['CP'],

  "x-externalVariables": {
    type: 'object',
    properties: {
      userId: {
        type: 'number',
      },
    }
  },
  links: [
    {
      name: 'Inicializar datos',
      description: 'Obtiene información inicial del usuario',
      dataRole: 'init',
      request: {
        method: 'GET',
        url: 'https://fenix.free.beeceptor.com/user-detail/{{userId}}',
        body: {},
        queryParams: [{ key: 'userId', value: '{{externalVariables.userId}}' }],
        testValues: {userId: 1},
      },
      response: {
        jsonSchema: {
          type: 'object',
          properties: {
            cp: { type: 'string' },
            state: { type: 'string' },
            city: { type: 'string' },
            municipality: { type: 'string' },
            settlements: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        testValues: {
          cp: '97380',
          state: 'Yucatan',
          city: 'Merida',
          municipality: 'Acanceh',
          settlements: [
            'Santiago',
            'San Cristobal',
            'San Juan'
          ]
        },
        responseMapping: {
          'CP.default': '{{cp}}',
          'Estado.default': '{{state}}',
          'Ciudad.default': '{{city}}',
          'Municipio.default': '{{municipality}}',
          'Colonia.enum': 'settlements'
        }
      }
    },

    {
      name: 'Catálogo de Planes',
      description: 'Obtiene el catálogo de planes',
      dataRole: 'catalog',
      request: {
        method: 'GET',
        url: 'https://axa-portal-backend.tiprotec.com.mx/api/plan',
        body: {},
        queryParams: [],
        testValues: {},
      },
      response: {
        jsonSchema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              nombre: { type: 'string' }
            }
          }
        },
        testValues: [
          {
            id: 1,
            nombre: 'Plan Básico'
          },
          {
            id: 2,
            nombre: 'Plan Familiar'
          },
          {
            id: 3,
            nombre: 'Plan Premium'
          }
        ],
        responseMapping: {
          'planId.enum': {
            path: '$root',
            itemValue: '{{id}}'
          },
          'planId.enumNames': {
            path: '$root',
            itemValue: '{{nombre}}'
          }
        }
      }
    },
    {
      name: 'Consultar Código Postal',
      description: 'Obtiene estado, ciudad, municipio y colonias a partir del CP',
      dataRole: 'dependent',
      request: {
        method: 'GET',
        url: 'https://axa-portal-backend.tiprotec.com.mx/api/tiprotec/direccion/cp/{{cp}}',
        body: {},
        queryParams: [
          {
            key: 'cp',
            value: '{{form.CP}}'
          }
        ],
        testValues: {
          CP: '97380'
        },
      },
      response: {
        jsonSchema: {
          type: 'object',
          properties: {
            state: { type: 'string' },
            city: { type: 'string' },
            municipality: { type: 'string' },
            settlements: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        testValues: {
          state: 'Yucatan',
          city: 'Merida',
          municipality: 'Acanceh',
          settlements: [
            'Santiago',
            'San Cristobal',
            'San Juan'
          ]
        },
        responseMapping: {
          'Estado.default': '{{state}}',
          'Ciudad.default': '{{city}}',
          'Municipio.default': '{{municipality}}',
          'Colonia.enum': 'settlements'
        }
      }
    }
  ]
};


export { shcemaNewDireccion };