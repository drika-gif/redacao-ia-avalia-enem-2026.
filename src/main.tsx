import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { PwaProvider } from './context/PwaContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <PwaProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </PwaProvider>
  </React.StrictMode>
);
