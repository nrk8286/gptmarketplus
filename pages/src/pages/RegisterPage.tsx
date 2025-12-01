import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function RegisterPage() {
  const { register, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (authLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    const result = await register(email, username, password, displayName || undefined);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Registration failed');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="auth-container">
      <h1 className="auth-title">Create Account</h1>
      
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="johndoe"
              pattern="[a-zA-Z0-9_]{3,30}"
              title="3-30 characters, alphanumeric and underscores only"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Display Name (optional)</label>
            <input
              type="text"
              className="form-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="John Doe"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={8}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary btn-lg" 
            style={{ width: '100%' }}
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
      </div>

      <div className="auth-footer">
        Already have an account? <Link to="/login">Login</Link>
      </div>
    </div>
  );
}

export default RegisterPage;
