import React, { useRef, useState } from 'react';

const DEFAULT_UPLOAD_ENDPOINT =
  'http://localhost:4000/api/v1/m-m/gestion-documentos/upload-file';

/**
 * @typedef {Object} UploadFileResponse
 * @property {boolean} exists
 * @property {string} uploadUrl
 */

const readResponseBody = async (response) => {
  const text = await response.text();

  if (!text) {
    return '';
  }

  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
};

const createHttpErrorMessage = async (response, fallbackMessage) => {
  const responseBody = await readResponseBody(response);

  return [
    fallbackMessage,
    `HTTP ${response.status} ${response.statusText}`.trim(),
    responseBody ? `Respuesta:\n${responseBody}` : '',
  ]
    .filter(Boolean)
    .join('\n');
};

/**
 * Solicita una URL presignada al API Gateway y sube el archivo directo a S3.
 */
export async function subirDocumento(
  file,
  endpoint = DEFAULT_UPLOAD_ENDPOINT
) {
  const contentType = file.type || 'application/octet-stream';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: file.name,
      contentType,
    }),
  });

  if (!response.ok) {
    throw new Error(
      await createHttpErrorMessage(response, 'No se pudo generar la URL de subida')
    );
  }

  /** @type {UploadFileResponse} */
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('El API devolvio una respuesta que no es JSON valido');
  }

  if (!data.uploadUrl) {
    throw new Error(
      `El API no devolvio una URL de subida valida\nRespuesta:\n${JSON.stringify(
        data,
        null,
        2
      )}`
    );
  }

  if (data.exists) {
    console.warn('El archivo ya existe y podria sobrescribirse');
  }

  const uploadResponse = await fetch(data.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error(
      await createHttpErrorMessage(uploadResponse, 'No se pudo subir el archivo a S3')
    );
  }

  return {
    name: file.name,
    size: file.size,
    contentType,
    exists: data.exists,
    uploaded: true,
  };
}

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / 1024 ** exponent;

  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const FileManagementExample = () => {
  const inputRef = useRef(null);
  const [endpoint, setEndpoint] = useState(DEFAULT_UPLOAD_ENDPOINT);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);

  const canUpload = Boolean(selectedFile) && status !== 'uploading';

  const selectFile = (file) => {
    setSelectedFile(file);
    setResult(null);
    setMessage('');
    setStatus('idle');
  };

  const handleInputChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      selectFile(file);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      selectFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setStatus('error');
      setMessage('Selecciona un archivo antes de subir.');
      return;
    }

    try {
      setStatus('uploading');
      setMessage('Solicitando URL presignada y enviando archivo a S3...');
      setResult(null);

      const uploadResult = await subirDocumento(
        selectedFile,
        endpoint.trim() || DEFAULT_UPLOAD_ENDPOINT
      );

      setResult(uploadResult);
      setStatus('success');
      setMessage(
        uploadResult.exists
          ? 'Archivo subido. El backend indico que ya existia.'
          : 'Archivo subido correctamente.'
      );
    } catch (error) {
      const contentType = selectedFile.type || 'application/octet-stream';
      let errorMessage =
        error instanceof Error ? error.message : 'Error inesperado';

      if (error instanceof TypeError) {
        errorMessage = [
          'No se pudo completar la peticion de red.',
          `Detalle: ${error.message}`,
          'Revisa que el API este activo, que CORS permita este origen y que la URL presignada acepte PUT.',
          `Content-Type usado: ${contentType}`,
        ].join('\n');
      }

      setStatus('error');
      setMessage(errorMessage);
      setResult({
        name: selectedFile.name,
        size: selectedFile.size,
        contentType,
        uploaded: false,
        error: errorMessage,
      });
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setResult(null);
    setMessage('');
    setStatus('idle');

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">File Management: carga S3</h1>
        <p className="page-description">
          Prototipo para pedir una URL presignada al API Gateway y cargar el
          archivo directamente a S3 con un PUT.
        </p>
      </div>

      <div className="s3-upload-layout">
        <section className="s3-upload-card">
          <div className="s3-upload-card-header">
            <span className="s3-upload-eyebrow">Presigned upload</span>
            <h2>Subir documento</h2>
            <p>
              El frontend no envia el binario al backend: solo solicita la URL
              temporal y luego sube cualquier documento directo al bucket.
            </p>
          </div>

          <div className="s3-upload-field">
            <label htmlFor="s3-endpoint">Endpoint API Gateway</label>
            <input
              id="s3-endpoint"
              type="url"
              value={endpoint}
              onChange={(event) => setEndpoint(event.target.value)}
            />
          </div>

          <div
            className={`s3-dropzone${dragActive ? ' s3-dropzone--active' : ''}`}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            <input
              ref={inputRef}
              id="s3-file"
              type="file"
              onChange={handleInputChange}
            />
            <label htmlFor="s3-file">
              <span className="s3-dropzone-icon">S3</span>
              <strong>
                {selectedFile
                  ? selectedFile.name
                  : 'Selecciona o arrastra un archivo'}
              </strong>
              <small>
                {selectedFile
                  ? `${formatBytes(selectedFile.size)} · ${
                      selectedFile.type || 'application/octet-stream'
                    }`
                  : 'Se usara application/octet-stream si el archivo no reporta tipo.'}
              </small>
            </label>
          </div>

          <div className="s3-upload-actions">
            <button
              type="button"
              className="s3-upload-button"
              disabled={!canUpload}
              onClick={handleUpload}
            >
              {status === 'uploading' ? 'Subiendo...' : 'Subir a S3'}
            </button>
            <button
              type="button"
              className="s3-upload-secondary"
              onClick={clearSelection}
              disabled={status === 'uploading'}
            >
              Limpiar
            </button>
          </div>

          {message && (
            <div className={`s3-upload-alert s3-upload-alert--${status}`}>
              {message}
            </div>
          )}
        </section>

        <aside className="s3-upload-panel">
          <h3>Contrato esperado</h3>
          <pre>{`POST /api/v1/m-m/gestion-documentos/upload-file
            {
              "name": "documento.pdf",
              "contentType": "application/pdf"
            }

            Response:
            {
              "exists": false,
              "uploadUrl": "https://..."
            }`}
          </pre>

          <h3>Resultado</h3>
          <div className="json-output s3-upload-output">
            {result
              ? JSON.stringify(result, null, 2)
              : 'Aun no hay cargas completadas.'}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default FileManagementExample;
