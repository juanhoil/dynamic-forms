import React, { useEffect, useState } from 'react';
import { renderTemplate } from '../utils/utils';

interface RenderedProps {
  value: string;
  values?: Record<string, unknown>;
  label?: string;
}

const Rendered: React.FC<RenderedProps> = ({
  value,
  values = {},
  label = 'rendered',
}) => {
  const [rendered, setRendered] = useState('');

  useEffect(() => {
    let cancelled = false;
    renderTemplate(value || '', values).then((next) => {
      if (!cancelled) setRendered(next);
    });
    return () => {
      cancelled = true;
    };
  }, [value, values]);

  return (
    <div className="iv-output">
      <strong>{label}: </strong>
      {JSON.stringify(rendered)}
    </div>
  );
};

export default Rendered;
