import React from 'react';
import { NavLink } from 'react-router-dom';

/**
 * Navbar component with navigation links
 * Uses NavLink for automatic active state styling
 */
const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-title">RJSF Playground</div>
        <ul className="navbar-links">
          <li>
            <NavLink to="/" end>
              🏠 Home
            </NavLink>
          </li>
          <li>
            <NavLink to="/example1">
              Ejemplo 1: Todos los tipos
            </NavLink>
          </li>
          <li>
            <NavLink to="/example2">
              Ejemplo 2: API Catálogo
            </NavLink>
          </li>
          <li>
            <NavLink to="/example3">
              Ejemplo 3: Código Postal
            </NavLink>
          </li>
          <li>
            <NavLink to="/example4">
              Ejemplo 4: Subir Archivos
            </NavLink>
          </li>
          <li>
            <NavLink to="/example5">
              Ejemplo 5: Documentos ID
            </NavLink>
          </li>
          <li>
            <NavLink to="/example6">
              Ejemplo 6: 3 Columnas
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
