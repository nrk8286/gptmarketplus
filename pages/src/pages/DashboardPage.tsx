import { useAuth } from '../hooks/useAuth';
import { useRentals, useUserSubscription, usePositions } from '../hooks/useApi';
import { Navigate, Link } from 'react-router-dom';
import type { Rental, UserSubscription, MarketPosition } from '../types';

function DashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: rentalsData, isLoading: rentalsLoading } = useRentals();
  const { data: subscriptionData, isLoading: subLoading } = useUserSubscription();
  const { data: positionsData, isLoading: posLoading } = usePositions();

  if (authLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const rentals = (rentalsData as { rentals: Rental[] })?.rentals || [];
  const subscription = (subscriptionData as { subscription: UserSubscription | null })?.subscription;
  const positions = (positionsData as { positions: MarketPosition[] })?.positions || [];

  const activeRentals = rentals.filter((r) => r.status === 'active');
  const totalPositionValue = positions.reduce((sum, p) => sum + p.currentValue, 0);

  return (
    <div>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Welcome back, {user?.displayName || user?.username}</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4" style={{ marginBottom: '2rem' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
            ${user?.walletBalance?.toFixed(2) || '0.00'}
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>Wallet Balance</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--secondary)' }}>
            {activeRentals.length}
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>Active Rentals</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent)' }}>
            ${totalPositionValue.toFixed(2)}
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>Market Positions</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
            {subscription?.tier || 'Free'}
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>Subscription</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div>
          {/* Active Rentals */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>Active Rentals</h2>
              <Link to="/models" className="btn btn-secondary">Browse Models</Link>
            </div>
            
            {rentalsLoading ? (
              <div className="loading">Loading...</div>
            ) : activeRentals.length > 0 ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>Type</th>
                    <th>Expires</th>
                    <th>Usage</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRentals.map((rental) => (
                    <tr key={rental.id}>
                      <td>{rental.modelName}</td>
                      <td style={{ textTransform: 'capitalize' }}>{rental.rentalType}</td>
                      <td>{rental.endsAt ? new Date(rental.endsAt).toLocaleDateString() : 'N/A'}</td>
                      <td>
                        {rental.requestsLimit 
                          ? `${rental.requestsUsed}/${rental.requestsLimit}` 
                          : rental.requestsUsed + ' requests'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <p>No active rentals</p>
                <Link to="/models" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                  Explore Models
                </Link>
              </div>
            )}
          </div>

          {/* Market Positions */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>Market Positions</h2>
              <Link to="/markets" className="btn btn-secondary">Browse Markets</Link>
            </div>
            
            {posLoading ? (
              <div className="loading">Loading...</div>
            ) : positions.length > 0 ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Market</th>
                    <th>Position</th>
                    <th>Shares</th>
                    <th>Value</th>
                    <th>P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((pos) => {
                    const pnl = pos.currentValue - pos.totalCost;
                    const pnlPercent = pos.totalCost > 0 ? (pnl / pos.totalCost) * 100 : 0;
                    return (
                      <tr key={pos.id}>
                        <td>
                          <Link to={`/markets/${pos.marketId}`}>{pos.marketTitle}</Link>
                        </td>
                        <td>{pos.outcomeName}</td>
                        <td>{pos.shares.toFixed(2)}</td>
                        <td>${pos.currentValue.toFixed(2)}</td>
                        <td style={{ color: pnl >= 0 ? 'var(--secondary)' : 'var(--danger)' }}>
                          {pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <p>No market positions</p>
                <Link to="/markets" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                  Explore Markets
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          {/* Subscription */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Subscription</h3>
            {subLoading ? (
              <div className="loading">Loading...</div>
            ) : subscription ? (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{subscription.planName}</div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    {subscription.billingCycle === 'yearly' ? 'Annual' : 'Monthly'} plan
                  </div>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <p>Renews: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
                  {subscription.cancelAtPeriodEnd && (
                    <p style={{ color: 'var(--accent)' }}>Cancels at period end</p>
                  )}
                </div>
                <Link to="/pricing" className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }}>
                  Manage
                </Link>
              </>
            ) : (
              <>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  You are on the free plan. Upgrade for more features.
                </p>
                <Link to="/pricing" className="btn btn-primary" style={{ width: '100%' }}>
                  View Plans
                </Link>
              </>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link to="/wallet" className="btn btn-secondary">Add Funds</Link>
              <Link to="/models" className="btn btn-secondary">Rent a Model</Link>
              <Link to="/markets" className="btn btn-secondary">Trade Markets</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
