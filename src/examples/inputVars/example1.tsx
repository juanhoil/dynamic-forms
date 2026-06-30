import React, { useState } from 'react';
import InputVars, { type InputVarOption } from './components/InputVars';
import Rendered from './components/Rendered';

const urlVars: InputVarOption[] = [
  { label: 'CP', value: '{{CP}}', type: 'number', color: '#2563EB', group: 'Form' },
  { label: 'Ciudad', value: '{{Ciudad}}', type: 'string', color: '#2563EB', group: 'Form' },
  { label: 'Estado', value: '{{Estado}}', type: 'string', color: '#2563EB', group: 'Form' },
  { label: 'Poliza ID', value: '{{polizaId}}', type: 'number', color: '#2563EB', group: 'Form' },
  { label: 'ID', value: '{{id}}', type: 'number', color: '#16A34A', group: 'External' },
];

const values = {
  CP: '12345',
  Ciudad: 'Ciudad de México',
  Estado: 'Estado de México',
  polizaId: '1234567890',
  id: '1234567890',
  nombre: 'Juan',
  producto: 'Seguro Auto',
};

const messageVars: InputVarOption[] = [
  ...urlVars,
  { label: 'Form {{nombre}}', value: '{{nombre}}', type: 'string', color: '#2563EB', group: 'Form' },
  { label: 'Catalog {{producto}}', value: '{{producto}}', type: 'string', color: '#B45309', group: 'Catalog' },
];

const InputVarsExample = () => {
  const [endpoint, setEndpoint] = useState('https://api.com/users/{{id}}');
  const [message, setMessage] = useState('Hola {{nombre}}, tu póliza es {{polizaId}}.');

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Input Vars</h1>
        <p className="page-description">
          Inputs con variables insertables como chips, similar al patrón de Cursor para agregar
          archivos o contexto.
        </p>
      </div>

      <div className="panel">
        <div style={{ maxWidth: 720, padding: '1.5rem', display: 'grid', gap: '2rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              Endpoint
            </label>
            <InputVars
              type="input"
              value={endpoint}
              variables={urlVars}
              placeholder="https://api.com/users/..."
              onChange={setEndpoint}
            />
            <Rendered value={endpoint} values={values} label="endpoint renderizado" />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
              Mensaje
            </label>
            <div style={{ fontSize: 12.5, color: '#6b7280', lineHeight: 1.5, marginBottom: 8 }}>
              Escribe el mensaje que recibirá el usuario.
            </div>
            <InputVars
              type="textarea"
              value={message}
              variables={messageVars}
              placeholder="Hola {{nombre}}, ..."
              onChange={setMessage}
            />
            <Rendered value={message} values={values} label="mensaje renderizado" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InputVarsExample;
