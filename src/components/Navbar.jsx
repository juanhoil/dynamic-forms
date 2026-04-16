import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { navigation } from '../routes';

const ChevronIcon = ({ open }) => (
  <svg
    className={`navbar-chevron${open ? ' navbar-chevron--open' : ''}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const NavSection = ({ title, children }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="navbar-section">
      <button className="navbar-section-header" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <ChevronIcon open={open} />
      </button>
      {open && <ul className="navbar-links navbar-section-body">{children}</ul>}
    </div>
  );
};

/**
 * Navbar component with navigation links grouped by section
 * Uses NavLink for automatic active state styling
 * Routes are configured in routes.jsx
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
        </ul>

        <NavSection title={navigation.forms.title}>
          {navigation.forms.links.map((link) => (
            <li key={link.path}>
              <NavLink to={link.path}>{link.label}</NavLink>
            </li>
          ))}
        </NavSection>

        <NavSection title={navigation.chats.title}>
          {navigation.chats.links.map((link) => (
            <li key={link.path}>
              <NavLink to={link.path}>{link.label}</NavLink>
            </li>
          ))}
        </NavSection>

        <NavSection title={navigation.http.title}>
          {navigation.http.links.map((link) => (
            <li key={link.path}>
              <NavLink to={link.path}>{link.label}</NavLink>
            </li>
          ))}
        </NavSection>

        {navigation.workflow && (
          <NavSection title={navigation.workflow.title}>
            {navigation.workflow.links.map((link) => (
              <li key={link.path}>
                <NavLink to={link.path}>{link.label}</NavLink>
              </li>
            ))}
          </NavSection>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
