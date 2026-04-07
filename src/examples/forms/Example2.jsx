import React, { useState, useEffect } from 'react';
import FormPlayground from '../../layouts/FormPlayground';

/**
 * Example 2: API Catalog Consumption
 *
 * Demonstrates:
 * - Fetching data from external API
 * - Mapping API response to select options
 * - Displaying names to user but storing only IDs
 * - Handling loading and error states
 * - Dynamic schema updates based on API data
 */

const API_URL = 'https://axa-portal-backend.tiprotec.com.mx/api/plan';

/**
 * Custom wrapper component to handle API fetching
 */
const Example2 = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  /**
   * Fetch plans from API
   */
  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Map API response to enum format for select
      setPlans(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching plans:', err);
      setError(`Error al cargar planes: ${err.message}`);
      setLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <h2>Cargando planes desde la API...</h2>
          <p>Por favor espera un momento.</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="container">
        <div className="error">
          <h2>Error</h2>
          <p>{error}</p>
          <button
            onClick={fetchPlans}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Build schema with dynamic plan options
  const schema = {
    title: 'Selección de Plan',
    type: 'object',
    required: ['nombre', 'email', 'planId'],
    properties: {
      nombre: {
        type: 'string',
        title: 'Nombre Completo',
        description: 'Ingresa tu nombre',
        minLength: 3
      },

      email: {
        type: 'string',
        title: 'Correo Electrónico',
        format: 'email'
      },

      telefono: {
        type: 'string',
        title: 'Teléfono',
        description: 'Número de contacto',
        pattern: '^[0-9]{10}$'
      },

      // Dynamic select populated from API
      // Stores only the ID, but displays the name
      planId: {
        type: 'string',
        title: 'Selecciona un Plan',
        description: 'Elige el plan que mejor se adapte a tus necesidades',
        enum: plans.map(plan => plan.id.toString()), // Store IDs
        enumNames: plans.map(plan => plan.nombre) // Display names
      },

      comentarios: {
        type: 'string',
        title: 'Comentarios Adicionales',
        description: 'Información adicional sobre tu solicitud'
      }
    }
  };

  const uiSchema = {
    nombre: {
      'ui:placeholder': 'Ej: Juan Pérez'
    },

    email: {
      'ui:placeholder': 'tu@email.com'
    },

    telefono: {
      'ui:placeholder': '5512345678',
      'ui:help': 'Formato: 10 dígitos sin espacios'
    },

    planId: {
      'ui:placeholder': 'Selecciona un plan'
    },

    comentarios: {
      'ui:widget': 'textarea',
      'ui:placeholder': 'Escribe tus comentarios aquí...',
      'ui:options': {
        rows: 4
      }
    }
  };

  const initialFormData = {
    nombre: '',
    email: '',
    telefono: '',
    comentarios: ''
  };

  const handleSubmit = (formData) => {
    // Find the selected plan details
    const selectedPlan = plans.find(
      plan => plan.id.toString() === formData.planId
    );

    console.log('Form Data:', formData);
    console.log('Selected Plan Details:', selectedPlan);

    alert(
      `Formulario enviado:\n\n` +
        `Nombre: ${formData.nombre}\n` +
        `Email: ${formData.email}\n` +
        `Plan ID: ${formData.planId}\n` +
        `Plan Nombre: ${selectedPlan?.nombre || 'N/A'}\n\n` +
        `Nota: Solo se guarda el ID (${formData.planId}) en formData.`
    );
  };

  return (
    <FormPlayground
      title="Ejemplo 2: Consumo de Catálogo desde API"
      description={`Este ejemplo consume la API en ${API_URL} para poblar dinámicamente un select. Se muestra el nombre del plan al usuario, pero solo se guarda el ID en formData. Total de planes cargados: ${plans.length}`}
      initialSchema={schema}
      initialUiSchema={uiSchema}
      initialFormData={initialFormData}
      onSubmit={handleSubmit}
    />
  );
};

export default Example2;
