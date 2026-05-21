import { useCallback, useEffect, useRef, useState } from 'react';

const getValue = (obj, pointer) => {
  if (!pointer || pointer === '/') return obj;

  return pointer
    .split('/')
    .filter(Boolean)
    .reduce((acc, part) => acc?.[part], obj);
};

const setValue = (obj, pointer, value) => {
  const parts = pointer.split('/').filter(Boolean);
  const newObj = JSON.parse(JSON.stringify(obj));
  let current = newObj;

  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      current[part] = value;
      return;
    }

    current = current[part] = current[part] || {};
  });

  return newObj;
};

const expandUriTemplate = (template, params) => {
  let url = template;

  url = url.replace(/{([^{?]+)}/g, (_, key) => params[key] || '');
  url = url.replace(/{\?([^}]+)}/g, (_, list) => {
    const query = list
      .split(',')
      .map((key) =>
        params[key] !== undefined
          ? `${key}=${encodeURIComponent(params[key])}`
          : null
      )
      .filter(Boolean)
      .join('&');

    return query ? `?${query}` : '';
  });

  return url;
};

const ensureEnumContainsValue = (schema, dataPointer, value) => {
  const propertyName = dataPointer.split('/').filter(Boolean)[0];
  const currentEnum = schema.properties?.[propertyName]?.enum;

  if (!Array.isArray(currentEnum) || value === undefined || value === null) {
    return schema;
  }

  const values = Array.isArray(value) ? value : [value];
  const nextEnum = [...currentEnum];

  values.forEach((item) => {
    if (item !== '' && !nextEnum.includes(item)) {
      nextEnum.push(item);
    }
  });

  return setValue(schema, `/properties/${propertyName}/enum`, nextEnum);
};

const resolveMappingValue = (responseData, source) => {
  if (typeof source === 'string') {
    return getValue(responseData, source);
  }

  if (!source || typeof source !== 'object') {
    return source;
  }

  const baseValue = getValue(responseData, source.path || '/');

  if (Array.isArray(baseValue) && source.itemValue) {
    return baseValue
      .map((item) => {
        const value = getValue(item, source.itemValue);
        return source.stringify && value !== undefined && value !== null
          ? String(value)
          : value;
      })
      .filter((value) => value !== undefined && value !== null);
  }

  return baseValue;
};

const isDataInputLink = (link) =>
  link.isDataInput === '1' || link.isDataInput === 1 || link.isDataInput === true;

const hasTemplatePointers = (link) =>
  Object.keys(link.templatePointers || {}).length > 0;

const getLinkKey = (link, index) => `${index}:${link.rel || ''}:${link.href}`;

const getSchemaByPointer = (schema, pointer) => {
  const parts = pointer.split('/').filter(Boolean);
  let current = schema;

  for (const part of parts) {
    current = current?.properties?.[part] || current?.[part];
  }

  return current;
};

const buildTemplateParams = (link, data, schema) => {
  const params = {};

  Object.entries(link.templatePointers || {}).forEach(([key, pointer]) => {
    let val = getValue(data, pointer);

    if (val === undefined || val === null || val === '') {
      const schemaNode = getSchemaByPointer(schema, pointer);

      if (schemaNode?.default !== undefined) {
        val = schemaNode.default;
      }
    }

    params[key] = val;
  });

  return params;
};

const hasInvalidTemplateParams = (link, params, schema) =>
  Object.entries(params).some(([key, value]) => {
    if (value === undefined || value === null || value === '') return true;

    const pointer = link.templatePointers?.[key];
    const schemaNode = pointer ? getSchemaByPointer(schema, pointer) : null;

    return (
      typeof value === 'string' &&
      schemaNode?.minLength !== undefined &&
      value.length < schemaNode.minLength
    );
  });

export function useJsonHyperSchema(initialSchema, formData, onUpdate) {
  const [loading, setLoading] = useState(false);
  const [dataInput, setDataInput] = useState(null);
  const hasLoadedInputLinks = useRef(false);
  const currentSchema = useRef(initialSchema);
  const lastTemplateRequestKeys = useRef({});
  const skipNextDependentSearch = useRef(false);

  const resolveLogic = useCallback((currentData, currentSchema) => {
    const updatedSchema = JSON.parse(JSON.stringify(currentSchema));
    const updatedData = { ...currentData };
    let changed = false;

    if (updatedSchema.allOf) {
      updatedSchema.allOf.forEach((block) => {
        if (!block.if) return;

        const conditionEntry = Object.entries(block.if.properties || {})[0];
        if (!conditionEntry) return;

        const [key, constraints] = conditionEntry;
        const val = currentData[key];
        const isMatch =
          (constraints.minimum === undefined || val >= constraints.minimum) &&
          (constraints.maximum === undefined || val <= constraints.maximum);
        const branch = isMatch ? block.then : block.else;

        if (branch?.properties) {
          Object.entries(branch.properties).forEach(([propertyKey, propertyValue]) => {
            if (propertyValue.const?.$data) {
              const sourcePath = propertyValue.const.$data.split('/').pop();

              if (updatedData[propertyKey] !== updatedData[sourcePath]) {
                updatedData[propertyKey] = updatedData[sourcePath];
                changed = true;
              }
            }

            if (!updatedSchema.properties[propertyKey]) {
              updatedSchema.properties[propertyKey] = propertyValue;
              changed = true;
            }
          });
        }
      });
    }

    return { updatedData, updatedSchema, changed };
  }, []);

  const mapResponse = useCallback(
    (link, responseData, currentData, currentSchema = initialSchema) => {
      let newData = { ...currentData };
      let newSchema = JSON.parse(JSON.stringify(currentSchema));

      if (link['x-responseMapping']) {
        Object.entries(link['x-responseMapping']).forEach(([target, source]) => {
          if (typeof source === 'object' && source.format) {
            const formatted = source.format.replace(
              /{([^}]+)}/g,
              (_, pointer) => getValue(responseData, pointer) || ''
            );

            newData = setValue(newData, target, formatted.trim());
            return;
          }

          if (target.includes('/enum')) {
            const schemaPointer = `/properties${target}`;
            const values = resolveMappingValue(responseData, source) || [];

            newSchema = setValue(newSchema, schemaPointer, values);
            return;
          }

          const val = resolveMappingValue(responseData, source);
          newData = setValue(newData, target, val);
          newSchema = ensureEnumContainsValue(newSchema, target, val);
        });
      }

      const { updatedData, updatedSchema } = resolveLogic(newData, newSchema);
      return { updatedData, updatedSchema };
    },
    [initialSchema, resolveLogic]
  );

  const executeLink = useCallback(
    async (link, url, currentData) => {
      setLoading(true);

      try {
        const response = await fetch(url);
        const responseData = await response.json();
        const mapped = mapResponse(
          link,
          responseData,
          currentData,
          currentSchema.current
        );

        currentSchema.current = mapped.updatedSchema;
        onUpdate(mapped.updatedData, mapped.updatedSchema);

        return mapped;
      } catch (error) {
        console.error('Error fetching schema data', error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [mapResponse, onUpdate]
  );

  useEffect(() => {
    if (hasLoadedInputLinks.current) return;

    const links = initialSchema.links || [];
    const inputLinks = links.filter(
      (link) => isDataInputLink(link) && !hasTemplatePointers(link)
    );
    const independentLinks = links.filter(
      (link) => !isDataInputLink(link) && !hasTemplatePointers(link)
    );

    if (!inputLinks.length && !independentLinks.length) return;

    hasLoadedInputLinks.current = true;

    const loadInputLinks = async () => {
      setLoading(true);

      try {
        let nextData = { ...formData };
        let nextSchema = JSON.parse(JSON.stringify(currentSchema.current));

        for (const phaseLinks of [inputLinks, independentLinks]) {
          const responses = await Promise.all(
            phaseLinks.map(async (link) => {
              const url = expandUriTemplate(link.href, {});
              const response = await fetch(url);
              const responseData = await response.json();

              return { link, responseData };
            })
          );

          responses.forEach(({ link, responseData }) => {
            const mapped = mapResponse(link, responseData, nextData, nextSchema);
            nextData = mapped.updatedData;
            nextSchema = mapped.updatedSchema;
          });

          if (phaseLinks === inputLinks) {
            setDataInput(nextData);
          }
        }

        currentSchema.current = nextSchema;
        skipNextDependentSearch.current = true;
        onUpdate(nextData, nextSchema);
      } catch (error) {
        console.error('Error fetching input schema data', error);
      } finally {
        setLoading(false);
      }
    };

    loadInputLinks();
  }, [formData, initialSchema, initialSchema.links, mapResponse, onUpdate]);

  useEffect(() => {
    if (skipNextDependentSearch.current) {
      (initialSchema.links || []).forEach((link, index) => {
        if (!hasTemplatePointers(link)) return;

        const params = buildTemplateParams(link, formData, initialSchema);
        const linkKey = getLinkKey(link, index);

        if (hasInvalidTemplateParams(link, params, initialSchema)) {
          delete lastTemplateRequestKeys.current[linkKey];
          return;
        }

        lastTemplateRequestKeys.current[linkKey] = expandUriTemplate(
          link.href,
          params
        );
      });
      skipNextDependentSearch.current = false;
      return undefined;
    }

    const timer = setTimeout(async () => {
      const links = initialSchema.links || [];

      for (const [index, link] of links.entries()) {
        if (!hasTemplatePointers(link)) continue;

        const params = buildTemplateParams(link, formData, initialSchema);
        const linkKey = getLinkKey(link, index);

        if (hasInvalidTemplateParams(link, params, initialSchema)) {
          delete lastTemplateRequestKeys.current[linkKey];
          continue;
        }

        const url = expandUriTemplate(link.href, params);
        if (url === lastTemplateRequestKeys.current[linkKey]) continue;

        lastTemplateRequestKeys.current[linkKey] = url;
        await executeLink(link, url, formData);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [executeLink, formData, initialSchema]);

  return { loading, dataInput };
}
