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

export function useJsonHyperSchema(initialSchema, formData, onUpdate) {
  const [loading, setLoading] = useState(false);
  const [dataInput, setDataInput] = useState(null);
  const hasLoadedInputLinks = useRef(false);
  const lastRequestKey = useRef('');
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
            const values = getValue(responseData, source) || [];

            newSchema = setValue(newSchema, schemaPointer, values);
            return;
          }

          const val = getValue(responseData, source);
          newData = setValue(newData, target, val);
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
        const mapped = mapResponse(link, responseData, currentData);

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

    const inputLinks = (initialSchema.links || []).filter(
      (link) =>
        (link.isDataInput === '1' ||
          link.isDataInput === 1 ||
          link.isDataInput === true) &&
        !Object.keys(link.templatePointers || {}).length
    );

    if (!inputLinks.length) return;

    hasLoadedInputLinks.current = true;

    const loadInputLinks = async () => {
      setLoading(true);

      try {
        const responses = await Promise.all(
          inputLinks.map(async (link) => {
            const url = expandUriTemplate(link.href, {});
            const response = await fetch(url);
            const responseData = await response.json();

            return { link, responseData };
          })
        );

        let nextData = { ...formData };
        let nextSchema = JSON.parse(JSON.stringify(initialSchema));

        responses.forEach(({ link, responseData }) => {
          const mapped = mapResponse(link, responseData, nextData, nextSchema);
          nextData = mapped.updatedData;
          nextSchema = mapped.updatedSchema;
        });

        setDataInput(nextData);
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
      skipNextDependentSearch.current = false;
      return undefined;
    }

    const timer = setTimeout(async () => {
      const links = initialSchema.links || [];

      for (const link of links) {
        if (link.rel !== 'search') continue;

        const params = {};

        Object.entries(link.templatePointers || {}).forEach(([key, pointer]) => {
          let val = getValue(formData, pointer);

          if (val === undefined || val === null || val === '') {
            const parts = pointer.split('/').filter(Boolean);
            let current = initialSchema;

            for (const part of parts) {
              current = current?.properties?.[part] || current?.[part];
            }

            if (current?.default !== undefined) {
              val = current.default;
            }
          }

          params[key] = val;
        });

        const isInvalid = Object.values(params).some((value) => {
          if (value === undefined || value === null || value === '') return true;
          if (
            typeof value === 'string' &&
            value.length < (initialSchema.properties?.CP?.minLength || 1)
          ) {
            return true;
          }

          return false;
        });

        if (isInvalid) continue;

        const url = expandUriTemplate(link.href, params);
        if (url === lastRequestKey.current) continue;

        lastRequestKey.current = url;
        await executeLink(link, url, formData);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [executeLink, formData, initialSchema]);

  return { loading, dataInput };
}
