import React, { useRef } from 'react';

function PreviewModalWidget(props) {
  const { value, onChange, label, required, options = {} } = props;
  const dialogRef = useRef(null);
  const fileInputRef = useRef(null);

  // Extraer opciones
  const accept = options.accept || '*';

  // Función para abrir modal
  const openModal = () => {
    if (value) {
      dialogRef.current?.showModal();
    }
  };

  // Función para cerrar modal
  const closeModal = () => {
    dialogRef.current?.close();
  };

  // Manejar selección de archivo
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      onChange(e.target?.result);
    };
    reader.readAsDataURL(file);
  };

  // Detectar tipo de archivo
  const getFileType = () => {
    if (!value) return null;

    if (value.startsWith('data:image/')) return 'image';
    if (value.includes('application/pdf')) return 'pdf';
    return 'other';
  };

  // Renderizar preview pequeño
  const renderPreview = () => {
    const fileType = getFileType();

    if (!value) {
      return (
        <div style={{
          width: '150px',
          height: '150px',
          border: '2px dashed #ccc',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999',
          fontSize: '3rem'
        }}>
          📄
        </div>
      );
    }

    if (fileType === 'image') {
      return (
        <div
          onClick={openModal}
          style={{
            width: '150px',
            height: '150px',
            border: '2px solid #ddd',
            borderRadius: '8px',
            overflow: 'hidden',
            cursor: 'pointer',
            position: 'relative'
          }}
        >
          <img
            src={value}
            alt="preview"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '0.25rem',
            textAlign: 'center',
            fontSize: '0.75rem'
          }}>
            🔍 Click para ampliar
          </div>
        </div>
      );
    }

    if (fileType === 'pdf') {
      return (
        <div
          onClick={openModal}
          style={{
            width: '150px',
            height: '150px',
            border: '2px solid #ddd',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backgroundColor: '#f9f9f9'
          }}
        >
          <div style={{ fontSize: '3rem' }}>📕</div>
          <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>PDF</div>
          <div style={{
            fontSize: '0.75rem',
            color: '#666',
            marginTop: '0.25rem'
          }}>
            Click para ver
          </div>
        </div>
      );
    }

    return (
      <div
        onClick={openModal}
        style={{
          width: '150px',
          height: '150px',
          border: '2px solid #ddd',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          backgroundColor: '#f9f9f9'
        }}
      >
        <div style={{ fontSize: '3rem' }}>📄</div>
        <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Archivo</div>
        <div style={{
          fontSize: '0.75rem',
          color: '#666',
          marginTop: '0.25rem'
        }}>
          Click para ver
        </div>
      </div>
    );
  };

  // Renderizar contenido del modal
  const renderModalContent = () => {
    const fileType = getFileType();

    if (fileType === 'image') {
      return (
        <img
          src={value}
          alt="vista completa"
          style={{
            maxWidth: '100%',
            maxHeight: '80vh',
            objectFit: 'contain'
          }}
        />
      );
    }

    if (fileType === 'pdf') {
      return (
        <iframe
          src={value}
          style={{
            width: '100%',
            height: '80vh',
            border: 'none'
          }}
          title="PDF Preview"
        />
      );
    }

    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
        <p>Vista previa no disponible para este tipo de archivo</p>
      </div>
    );
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      {/* Label */}
      {label && (
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
          {label} {required && <span style={{ color: 'red' }}>*</span>}
        </label>
      )}

      {/* Preview + Botón de Subir */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        {/* Preview pequeño (clickeable) */}
        {renderPreview()}

        {/* Botón de subir archivo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            📁 {value ? 'Cambiar archivo' : 'Subir archivo'}
          </button>

          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                // Limpiar el input file para permitir re-subir el mismo archivo
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f5f5f5',
                color: '#d32f2f',
                border: '1px solid #d32f2f',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              🗑️ Eliminar
            </button>
          )}
        </div>
      </div>

      {/* Modal Dialog */}
      <dialog
        ref={dialogRef}
        style={{
          padding: 0,
          border: 'none',
          borderRadius: '8px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}
        onClick={(e) => {
          // Cerrar si se hace clic fuera del contenido
          if (e.target === dialogRef.current) {
            closeModal();
          }
        }}
      >
        <div style={{ padding: '1rem' }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid #eee'
          }}>
            <h3 style={{ margin: 0 }}>{label || 'Vista Completa'}</h3>
            <button
              onClick={closeModal}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                padding: '0.25rem'
              }}
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div style={{ textAlign: 'center' }}>
            {renderModalContent()}
          </div>
        </div>
      </dialog>
    </div>
  );
}

export default PreviewModalWidget;
