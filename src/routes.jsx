import Home from './examples/Home';
import Example1 from './examples/forms/Example1';
import Example2 from './examples/forms/Example2';
import Example3 from './examples/forms/Example3';
import Example4 from './examples/forms/Example4';
import Example5 from './examples/forms/Example5';
import Example6 from './examples/forms/Example6';
import ChatExample1 from './examples/chats/Example1';
import ExampleHR1 from './examples/http/exampleHR1';
import WorkflowExample1 from './examples/workflow/WorkflowExample1';
import WorkflowExample2 from './examples/workflow/WorkflowExample2';

/**
 * Route configuration for the application
 * Organized by sections: forms, chats, http-request
 */
export const routes = [
  { path: '/', element: <Home /> },
  { path: '/forms/example1', element: <Example1 /> },
  { path: '/forms/example2', element: <Example2 /> },
  { path: '/forms/example3', element: <Example3 /> },
  { path: '/forms/example4', element: <Example4 /> },
  { path: '/forms/example5', element: <Example5 /> },
  { path: '/forms/example6', element: <Example6 /> },
  { path: '/chats/example1', element: <ChatExample1 /> },
  { path: '/http/exampleHR1', element: <ExampleHR1 /> },
  { path: '/workflow/example1', element: <WorkflowExample1 /> },
  { path: '/workflow/example2', element: <WorkflowExample2 /> },
];

/**
 * Navigation configuration for the navbar
 * Organized by sections with labels
 */
export const navigation = {
  forms: {
    title: 'Formularios Dinámicos',
    links: [
      { path: '/forms/example1', label: 'Ejemplo 1: Todos los tipos' },
      { path: '/forms/example2', label: 'Ejemplo 2: API Catálogo' },
      { path: '/forms/example3', label: 'Ejemplo 3: Código Postal' },
      { path: '/forms/example4', label: 'Ejemplo 4: Subir Archivos' },
      { path: '/forms/example5', label: 'Ejemplo 5: Documentos ID' },
      { path: '/forms/example6', label: 'Ejemplo 6: 3 Columnas' },
    ],
  },
  chats: {
    title: 'Chats',
    links: [
      { path: '/chats/example1', label: 'Ejemplo 1: Chat Básico' },
    ],
  },
  http: {
    title: 'HTTP Requests',
    links: [
      { path: '/http/exampleHR1', label: 'Ejemplo HR1: Postwoman Style' },
    ],
  },
  workflow: {
    title: 'Workflows',
    links: [
      { path: '/workflow/example1', label: 'Ejemplo 1: Lifecycle de Tickets' },
      { path: '/workflow/example2', label: 'Ejemplo 2: Ticket State Machine' },
    ],
  },
};
