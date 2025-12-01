import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function Layout() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <div className="layout">
      <nav className="nav">
        <div className="container nav-container">
          <Link to="/" className="nav-logo">
            GPT<span>Marketplace</span>+
          </Link>
          
          <ul className="nav-links">
            <li><Link to="/models">Models</Link></li>
            <li><Link to="/markets">Markets</Link></li>
            <li><Link to="/pricing">Pricing</Link></li>
          </ul>
          
          <div className="nav-actions">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="btn btn-secondary">Dashboard</Link>
                <Link to="/wallet" className="btn btn-secondary">
                  ${user?.walletBalance?.toFixed(2) || '0.00'}
                </Link>
                <button onClick={logout} className="btn btn-secondary">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-secondary">Login</Link>
                <Link to="/register" className="btn btn-primary">Get Started</Link>
              </>
            )}
          </div>
        </div>
      </nav>
      
      <main className="main-content">
        <div className="container">
          <Outlet />
        </div>
      </main>
      
      <footer className="footer">
        <div className="container">
          <p>© {new Date().getFullYear()} GPT Marketplace Plus. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
