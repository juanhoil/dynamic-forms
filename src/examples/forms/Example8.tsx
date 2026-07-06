import JshonHyperschemaEditor from './example8/components/JshonHyperschemaEditor';
import type { JsonHyperSchema } from './types';
import { shcemaNewDireccion as schemaDireccion } from './shcemas';

type Example8Props = {
  baseConfig?: {
    schema?: JsonHyperSchema;
    uiSchema?: Record<string, any>;
    [key: string]: any;
  };
  log?: Record<string, any>;
};

const defaultBaseConfig = {
  schema: schemaDireccion as JsonHyperSchema,
  uiSchema: {},
};

const defaultFormLog = {
  dataInput: {},
  dataOutput: {},
};

const Example8 = ({ baseConfig = defaultBaseConfig, log = defaultFormLog }: Example8Props = {}) => (
  <JshonHyperschemaEditor baseConfig={baseConfig} log={log} />
);

export default Example8;