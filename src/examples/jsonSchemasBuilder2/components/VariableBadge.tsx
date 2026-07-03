import { X } from 'lucide-react';
import { memo } from 'react';
import type { VariableBadgeProps } from './interface.JsonSchemaBuilder';

const sizeStyles = {
  sm: {
    container: 'px-1.5 py-0.5 text-xs gap-1',
    icon: 'w-3 h-3',
  },
  md: {
    container: 'px-2 py-1 text-sm gap-1.5',
    icon: 'w-3.5 h-3.5',
  },
  lg: {
    container: 'px-2.5 py-1.5 text-base gap-2',
    icon: 'w-4 h-4',
  },
  xl: {
    container: 'px-3 py-2 text-lg gap-2.5',
    icon: 'w-5 h-5',
  },
};

const VariableBadge = memo(({ label, onRemove, color = '#0891b2', selected = false, size = 'sm', title = '' }: VariableBadgeProps) => {
  const styles = sizeStyles[size];
  return (
    <span
      className={`inline-flex items-center rounded-md font-medium inset-ring transition-all ${styles.container}`}
      style={{
        backgroundColor: selected ? color : `color-mix(in srgb, ${color} 10%, transparent)`,
        color: selected ? 'white' : color,
        '--tw-ring-color': `color-mix(in srgb, ${color} 20%, transparent)`,
      } as React.CSSProperties}
      title={title}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="cursor-pointer rounded-sm p-0.5 transition-colors"
          style={{
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${color} 20%, transparent)`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <X className={styles.icon} />
        </button>
      )}
    </span>
  );
});

VariableBadge.displayName = 'VariableBadge';

export default VariableBadge;
