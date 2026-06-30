import 'jsonjoy-builder/styles.css';
import CustomJsonSchema  from '@/examples/jsonSchemasBuilder2/components/CustomJsonSchema';

const JsonSchemaSuggest = ({ schema, response }) => {
  return (
    <div style={{ marginTop: '1rem' }}>
      {/* Schema Display */}
      <div
        style={{
          minHeight: '200px',
          maxHeight: '400px',
          overflow: 'auto',
          backgroundColor: schema ? '#fff' : '#1e1e1e',
          borderRadius: '4px',
          padding: '1rem'
        }}
      >
        {schema && (
          <CustomJsonSchema
            schema={schema}
            onChange={() => {}}
            readOnly={true}
          />
        )}
      </div>
    </div>
  );
};

export default JsonSchemaSuggest;
