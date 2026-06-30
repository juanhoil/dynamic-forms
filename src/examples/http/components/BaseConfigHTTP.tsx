import React, { useEffect, useState } from 'react';
import RequestSection from './RequestSection';
import ResponseSection from './ResponseSection';
import apiClient from '../utils/apiClient';
import { createSchemaFromJson } from '../utils/schemaInference';
import { buildRequest } from '../utils/buildRequest';

// Ensure the link always has a usable shape: when a request sub-field has no
// configuration (null / missing), it defaults to `{}`. testValues defaults to
// an empty object too. Unknown fields are preserved.
const normalizeLink = (cfg: any) => {
  const base = cfg || {};
  const req = base.request || {};
  return {
    name: 'New link',
    description: '',
    dataRole: 'init',
    response: { jsonSchema: null, responseMapping: null },
    ...base,
    request: {
      ...req,
      method: req.method || 'GET',
      url: req.url || '',
      headers: req.headers ?? {},
      body: req.body ?? {},
      queryVariables: req.queryVariables ?? {},
      externalVariables: req.externalVariables ?? {},
      testValues: req.testValues ?? {}
    }
  };
};

interface BaseConfigHTTPProps {
  httpConfig?: any;
  onConfigChange?: ((config: any) => void) | null;
  renderHeader?: (link: any) => React.ReactNode;
  formSchema?: any;
}

const BaseConfigHTTP = ({
  httpConfig = null,
  formSchema = null,
  onConfigChange = null,
  renderHeader,
}: BaseConfigHTTPProps) => {
  const [link, setLink] = useState(() => normalizeLink(httpConfig));
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Keep internal state in sync when the parent swaps the selected link
  // (e.g. user clicks a different card and reopens the modal).
  useEffect(() => {
    setLink(normalizeLink(httpConfig));
    setResponse(null);
    setError(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [httpConfig?.id]);

  const updateLink = (updater: any) => {
    setLink((prev: any) => (typeof updater === 'function' ? updater(prev) : updater));
  };

  // Notify the parent AFTER render, not inside the setLink updater. Calling the
  // parent's setState from within the updater updates another component during
  // this component's render phase ("Cannot update a component while rendering
  // a different component").
  useEffect(() => {
    if (onConfigChange) onConfigChange(link);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link]);

  const handleSend = async () => {
    setLoading(true);
    setError(false);

    try {
      // testValues is the single source of values: {{tokens}} in the URL
      // (path and query string), body and headers are resolved from it.
      const { method, url, data, headers } = await buildRequest(
        link.request,
        link.request.testValues
      );

      const result = await apiClient({ method, url, data, headers: headers as any });

      let responseContent;
      let schema = link.response?.jsonSchema;

      if (typeof result.data === 'object' && result.data !== null) {
        responseContent = JSON.stringify(result.data, null, 2);
        try {
          schema = createSchemaFromJson(result.data);
        } catch (e) {
          console.error('Failed to generate schema:', e);
        }
      } else {
        responseContent = String(result.data);
      }

      setResponse({
        statusCode: result.status,
        content: responseContent,
        time: result.duration ? (result.duration / 1000).toFixed(3) : 0,
        error: false
      });

      // Persist inferred schema AND the actual response values back into the
      // link, so the parent and the "JSON Schema Suggest" tab stay in sync.
      // response.testValues captures the concrete data from each request.
      updateLink((prev: any) => ({
        ...prev,
        response: {
          ...(prev.response || {}),
          jsonSchema: schema,
          testValues: result.data
        }
      }));
    } catch (err: any) {
      let errorContent = err.message;
      const statusCode = err.response?.status || 0;

      if (err.response?.data) {
        if (typeof err.response.data === 'object') {
          errorContent = JSON.stringify(err.response.data, null, 2);
        } else {
          errorContent = String(err.response.data);
        }
      }

      setResponse({
        statusCode,
        content: errorContent,
        time: err.duration ? (err.duration / 1000).toFixed(3) : 0,
        error: true
      });
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {renderHeader?.(link)}

      {/* Config editor + executor */}
      <div style={{ padding: '1.5rem' }}>
        <RequestSection
          link={link}
          formSchema={formSchema}
          setLink={updateLink}
          onSend={handleSend}
          loading={loading}
          response={response}
        />

        <ResponseSection
          link={link}
          formSchema={formSchema}
          response={response}
          loading={loading}
          error={error}
        />
      </div>
    </>
  );
};

export default BaseConfigHTTP;
