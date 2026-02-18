import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './examples/Home';
import Example1 from './examples/Example1';
import Example2 from './examples/Example2';
import Example3 from './examples/Example3';
import Example4 from './examples/Example4';
import Example5 from './examples/Example5';
import Example6 from './examples/Example6';

/**
 * Main App component
 * Sets up routing and layout structure
 */
function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/example1" element={<Example1 />} />
            <Route path="/example2" element={<Example2 />} />
            <Route path="/example3" element={<Example3 />} />
            <Route path="/example4" element={<Example4 />} />
            <Route path="/example5" element={<Example5 />} />
            <Route path="/example6" element={<Example6 />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
