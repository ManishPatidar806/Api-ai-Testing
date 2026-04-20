import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import Card from '../../components/common/Card';
import { useAuth } from '../../hooks/useAuth';

function LoginPage() {
  const { signInWithGoogle, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';
  const isGoogleConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  const [error, setError] = useState('');

  const onGoogleSuccess = async (credentialResponse) => {
    setError('');

    try {
      await signInWithGoogle(credentialResponse.credential);
      navigate(from, { replace: true });
    } catch (submitError) {
      setError(submitError.message || 'Google SSO failed');
    }
  };

  const onGoogleError = () => {
    setError('Unable to complete Google login');
  };

  return (
    <Card title="Welcome Back" subtitle="Sign in or create your account with Google" className="p-6 md:p-7">
      <div className="space-y-3">
        {isGoogleConfigured ? (
          <div className={loading ? 'pointer-events-none opacity-70' : ''}>
            <GoogleLogin onSuccess={onGoogleSuccess} onError={onGoogleError} />
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            Google sign-in is currently unavailable. Please contact support.
          </div>
        )}
        <p className="text-xs text-slate-500">
          Your account is secured using Google authentication.
        </p>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </div>
    </Card>
  );
}

export default LoginPage;
