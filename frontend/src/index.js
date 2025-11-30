import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/globals.css'; // Changed from './index.css'
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);