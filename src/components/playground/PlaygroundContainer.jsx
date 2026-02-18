import React from 'react';

/**
 * PlaygroundContainer - Two-panel grid layout for playground examples
 *
 * Provides the standard two-column grid layout used across examples.
 * Automatically responsive (stacks on mobile).
 *
 * @param {React.ReactNode} children - Paneles izquierdo y derecho
 * @param {string} [className=''] - Clases CSS adicionales
 * @param {string} [gap='1.5rem'] - Espacio entre paneles
 */
export const PlaygroundContainer = ({
  children,
  className = '',
  gap = '1.5rem'
}) => {
  return (
    <div
      className={`playground-container ${className}`}
      style={gap !== '1.5rem' ? { gap } : undefined}
    >
      {children}
    </div>
  );
};
