import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/auth/AuthState';
import { ChatProvider } from './context/chat/ChatState';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <ChatProvider>
        <App />
      </ChatProvider>
    </AuthProvider>
  </React.StrictMode>
);