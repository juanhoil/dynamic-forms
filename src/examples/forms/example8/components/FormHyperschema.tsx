import React, { useCallback, useEffect, useRef, useState } from 'react';
import Form from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';
import { formatLinkRunError, useJsonHyperSchema } from '../hooks/useJsonHyperSchema';
import type { JsonHyperSchema } from '../../types';
import type { FormProps, IChangeEvent } from '@rjsf/core';

type AnyRecord = Record<string, any>;

type FormHyperschemaOptions = {
  initialFormData?: AnyRecord;
  service?: any;
  useTestValues?: boolean;
  values?: AnyRecord;
  autoStart?: boolean;
  dependentDebounceMs?: number;
};

type FormHyperschemaContext = ReturnType<typeof useJsonHyperSchema> & {
  activeSchema: JsonHyperSchema;
  setActiveSchema: React.Dispatch<React.SetStateAction<JsonHyperSchema>>;
  formData: AnyRecord;
  setFormData: React.Dispatch<React.SetStateAction<AnyRecord>>;
};

type FormHyperschemaRunningContext = Pick<FormHyperschemaContext, 'loading' | 'error'>;
type FormHyperschemaSubmitContext = Pick<FormHyperschemaContext, 'submit'>;

type RjsfPassthroughProps = Omit<
  FormProps<AnyRecord, any, any>,
  'schema' | 'validator' | 'formData' | 'onChange' | 'onSubmit' | 'disabled'
>;

type FormHyperschemaProps = RjsfPassthroughProps & {
  hyperSchema: JsonHyperSchema;
  options?: FormHyperschemaOptions;
  disabled?: boolean;
  running?: (context: FormHyperschemaRunningContext) => void;
  onDataInput?: (dataInput: unknown) => void;
  onFormData?: (formData: AnyRecord) => void;
  onActiveSchema?: (schema: JsonHyperSchema) => void;
  onChange?: FormProps<AnyRecord, any, any>['onChange'];
  onSubmit?: (context: FormHyperschemaSubmitContext) => void | Promise<void>;
};

export function FormHyperschema({
  hyperSchema,
  options = {},
  disabled = false,
  running, //error y loading
  onDataInput,
  onFormData,
  onActiveSchema,
  onChange,
  onSubmit,
  ...formProps
}: FormHyperschemaProps) {
  const {
    initialFormData = {},
    ...hyperSchemaOptions
  } = options;
  const [formData, setFormData] = useState<AnyRecord>(initialFormData);
  const [activeSchema, setActiveSchema] = useState<JsonHyperSchema>(hyperSchema);

  const handleHyperSchemaUpdate = useCallback((newData: AnyRecord, newSchema?: JsonHyperSchema) => {
    if (newSchema) {
      setActiveSchema(newSchema);
    }
    setFormData(newData);
  }, []);

  const hyperSchemaState = useJsonHyperSchema(
    hyperSchema,
    formData,
    handleHyperSchemaUpdate,
    hyperSchemaOptions
  );

  const handleFormChange = useCallback(
    (data: IChangeEvent<AnyRecord, any, any>, id?: string) => {
      setFormData(data.formData || {});
      onChange?.(data, id);
    },
    [onChange]
  );

  const context: FormHyperschemaContext = {
    ...hyperSchemaState,
    activeSchema,
    setActiveSchema,
    formData,
    setFormData,
  };

  const handleSubmit = () => onSubmit?.({ submit: context.submit });
  const runningRef = useRef(running);
  const dataInputRef = useRef(onDataInput);
  const formDataRef = useRef(onFormData);
  const activeSchemaRef = useRef(onActiveSchema);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    dataInputRef.current = onDataInput;
  }, [onDataInput]);

  useEffect(() => {
    formDataRef.current = onFormData;
  }, [onFormData]);

  useEffect(() => {
    activeSchemaRef.current = onActiveSchema;
  }, [onActiveSchema]);

  useEffect(() => {
    runningRef.current?.({ loading: context.loading, error: context.error });
  }, [context.loading, context.error]);

  useEffect(() => {
    dataInputRef.current?.(context.dataInput);
  }, [context.dataInput]);

  useEffect(() => {
    formDataRef.current?.(formData);
  }, [formData]);

  useEffect(() => {
    activeSchemaRef.current?.(activeSchema);
  }, [activeSchema]);

  return (
    <Form
      {...formProps}
      schema={activeSchema}
      formData={formData}
      validator={validator}
      disabled={disabled}
      onChange={handleFormChange}
      onSubmit={handleSubmit}
    />
  );
}

export { formatLinkRunError };
export default FormHyperschema;
