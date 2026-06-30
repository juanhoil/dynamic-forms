import React, { useEffect, useState } from 'react';
import { renderTemplate } from '../utils/TemplateExpressionEngineCEL';

interface RenderedProps {
  value: string;
  values?: Record<string, unknown>;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

const Rendered: React.FC<RenderedProps> = ({
  value,
  values = {},
  label = 'rendered',
  className = '',
  style,
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
    <div
      className={`mt-2 whitespace-pre-wrap break-all font-mono text-xs text-gray-700 ${className}`}
      style={style}
    >
      <strong className="font-semibold text-gray-950">{label}: </strong>
      <span>{JSON.stringify(rendered)}</span>
    </div>
  );
};

export default Rendered;
