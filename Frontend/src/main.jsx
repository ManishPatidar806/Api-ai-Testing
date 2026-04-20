import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import './index.css';
import { AuthProvider } from './context/AuthContext';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const fallbackClientId = googleClientId || 'missing-google-client-id';

createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId={fallbackClientId}>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </GoogleOAuthProvider>,
);
