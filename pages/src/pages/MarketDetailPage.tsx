import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMarket } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import type { MarketOutcome } from '../types';

interface MarketDetailData {
  id: string;
  title: string;
  description: string | null;
  category: string;
  resolutionCriteria: string;
  currentLiquidity: number;
  tradingVolume: number;
  status: string;
  resolvesAt: string;
  outcomes: MarketOutcome[];
  creator: { username: string };
  recentTrades: Array<{
    id: string;
    username: string;
    tradeType: string;
    shares: number;
    pricePerShare: number;
    totalAmount: number;
    createdAt: string;
  }>;
}

function MarketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data, isLoading, error, refetch } = useMarket(id || '');
  
  const [selectedOutcome, setSelectedOutcome] = useState<MarketOutcome | null>(null);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState<string>('10');
  const [isTrading, setIsTrading] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);

  const market = data as MarketDetailData | null;

  const handleTrade = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!selectedOutcome) {
      setTradeError('Please select an outcome');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setTradeError('Please enter a valid amount');
      return;
    }

    setIsTrading(true);
    setTradeError(null);

    try {
      const response = await api.placeTrade(id!, selectedOutcome.id, tradeType, amountNum);
      if (response.success) {
        setAmount('10');
        refetch();
      } else {
        setTradeError(response.error || 'Failed to execute trade');
      }
    } catch {
      setTradeError('An error occurred');
    } finally {
      setIsTrading(false);
    }
  };

  if (isLoading) {
    return <div className="loading">Loading market...</div>;
  }

  if (error || !market) {
    return <div className="empty-state">Market not found</div>;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Market Info */}
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <span className="market-category">{market.category}</span>
            
            <h1 style={{ marginBottom: '0.5rem' }}>{market.title}</h1>
            
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Created by {market.creator?.username || 'Anonymous'}
            </p>

            {market.description && (
              <p style={{ marginBottom: '1.5rem' }}>{market.description}</p>
            )}

            <div style={{ display: 'flex', gap: '2rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              <span>💰 {formatCurrency(market.currentLiquidity)} liquidity</span>
              <span>📈 {formatCurrency(market.tradingVolume)} volume</span>
              <span>⏰ Resolves {formatDate(market.resolvesAt)}</span>
            </div>

            <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.5rem' }}>
              <strong>Resolution Criteria:</strong>
              <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                {market.resolutionCriteria}
              </p>
            </div>
          </div>

          {/* Outcomes */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Outcomes</h3>
            {market.outcomes?.map((outcome) => (
              <div
                key={outcome.id}
                onClick={() => setSelectedOutcome(outcome)}
                style={{
                  padding: '1rem',
                  border: `2px solid ${selectedOutcome?.id === outcome.id ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: '0.5rem',
                  marginBottom: '0.5rem',
                  cursor: 'pointer',
                  background: selectedOutcome?.id === outcome.id ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{outcome.name}</strong>
                    {outcome.description && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {outcome.description}
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                      {(outcome.probability * 100).toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      ${outcome.currentPrice.toFixed(2)}/share
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Trades */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Recent Trades</h3>
            {market.recentTrades?.length > 0 ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Type</th>
                    <th>Shares</th>
                    <th>Amount</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {market.recentTrades.map((trade) => (
                    <tr key={trade.id}>
                      <td>{trade.username}</td>
                      <td>
                        <span className={`badge ${trade.tradeType === 'buy' ? 'badge-success' : 'badge-danger'}`}>
                          {trade.tradeType.toUpperCase()}
                        </span>
                      </td>
                      <td>{trade.shares.toFixed(2)}</td>
                      <td>{formatCurrency(trade.totalAmount)}</td>
                      <td style={{ color: 'var(--text-muted)' }}>
                        {new Date(trade.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No trades yet</p>
            )}
          </div>
        </div>

        {/* Trade Panel */}
        <div>
          <div className="card" style={{ position: 'sticky', top: '1rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Place Trade</h3>

            {market.status !== 'open' ? (
              <p style={{ color: 'var(--text-muted)' }}>
                This market is {market.status}. Trading is not available.
              </p>
            ) : (
              <>
                {/* Trade Type */}
                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Trade Type</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className={`btn ${tradeType === 'buy' ? 'btn-success' : 'btn-secondary'}`}
                      onClick={() => setTradeType('buy')}
                      style={{ flex: 1 }}
                    >
                      Buy
                    </button>
                    <button
                      className={`btn ${tradeType === 'sell' ? 'btn-danger' : 'btn-secondary'}`}
                      onClick={() => setTradeType('sell')}
                      style={{ flex: 1 }}
                    >
                      Sell
                    </button>
                  </div>
                </div>

                {/* Selected Outcome */}
                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Selected Outcome</label>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '0.5rem' }}>
                    {selectedOutcome ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{selectedOutcome.name}</span>
                        <span>${selectedOutcome.currentPrice.toFixed(2)}</span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Select an outcome above</span>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <div className="form-group">
                  <label className="form-label">Amount ($)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="1"
                    step="1"
                  />
                </div>

                {selectedOutcome && amount && (
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                    You will {tradeType === 'buy' ? 'receive' : 'sell'} approximately{' '}
                    <strong>{(parseFloat(amount) / selectedOutcome.currentPrice).toFixed(2)} shares</strong>
                  </p>
                )}

                {tradeError && (
                  <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{tradeError}</div>
                )}

                <button
                  className={`btn ${tradeType === 'buy' ? 'btn-success' : 'btn-danger'} btn-lg`}
                  style={{ width: '100%' }}
                  onClick={handleTrade}
                  disabled={isTrading || !selectedOutcome}
                >
                  {isTrading ? 'Processing...' : isAuthenticated ? `${tradeType === 'buy' ? 'Buy' : 'Sell'} Shares` : 'Login to Trade'}
                </button>

                <p style={{ textAlign: 'center', marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  2% trading fee applies
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MarketDetailPage;
