import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWallet, useWalletTransactions } from '../hooks/useApi';
import { Navigate } from 'react-router-dom';
import api from '../services/api';
import type { WalletTransaction } from '../types';

function WalletPage() {
  const { isAuthenticated, isLoading: authLoading, refreshUser } = useAuth();
  const { data: walletData, isLoading: walletLoading, refetch: refetchWallet } = useWallet();
  const { data: transactionsData, isLoading: txLoading } = useWalletTransactions();
  
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (authLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const wallet = walletData as { balance: number; currency: string } | null;
  const transactions = (transactionsData as { transactions: WalletTransaction[] })?.transactions || [];

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsDepositing(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.addFunds(amount);
      if (response.success) {
        setSuccess(`Successfully deposited $${amount.toFixed(2)}`);
        setDepositAmount('');
        refetchWallet();
        refreshUser();
      } else {
        setError(response.error || 'Failed to deposit');
      }
    } catch {
      setError('An error occurred');
    } finally {
      setIsDepositing(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (amount > (wallet?.balance || 0)) {
      setError('Insufficient balance');
      return;
    }

    setIsWithdrawing(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.withdrawFunds(amount);
      if (response.success) {
        setSuccess(`Withdrawal of $${amount.toFixed(2)} initiated`);
        setWithdrawAmount('');
        refetchWallet();
        refreshUser();
      } else {
        setError(response.error || 'Failed to withdraw');
      }
    } catch {
      setError('An error occurred');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit': return '💰';
      case 'withdrawal': return '💸';
      case 'rental': return '🤖';
      case 'refund': return '↩️';
      case 'payout': return '💵';
      case 'bonus': return '🎁';
      default: return '💳';
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Wallet</h1>

      {/* Balance Card */}
      <div className="wallet-balance">
        {walletLoading ? (
          <div>Loading...</div>
        ) : (
          <>
            <div className="wallet-label">Available Balance</div>
            <div className="wallet-amount">${wallet?.balance?.toFixed(2) || '0.00'}</div>
          </>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', color: 'var(--danger)' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--secondary)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', color: 'var(--secondary)' }}>
          {success}
        </div>
      )}

      <div className="grid grid-cols-2" style={{ marginBottom: '2rem' }}>
        {/* Deposit */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Add Funds</h3>
          <div className="form-group">
            <label className="form-label">Amount ($)</label>
            <input
              type="number"
              className="form-input"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Enter amount"
              min="1"
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            {[25, 50, 100, 250].map((amount) => (
              <button
                key={amount}
                className="btn btn-secondary"
                onClick={() => setDepositAmount(amount.toString())}
                style={{ flex: 1 }}
              >
                ${amount}
              </button>
            ))}
          </div>
          <button
            className="btn btn-success btn-lg"
            style={{ width: '100%' }}
            onClick={handleDeposit}
            disabled={isDepositing}
          >
            {isDepositing ? 'Processing...' : 'Deposit'}
          </button>
        </div>

        {/* Withdraw */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Withdraw Funds</h3>
          <div className="form-group">
            <label className="form-label">Amount ($)</label>
            <input
              type="number"
              className="form-input"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="Enter amount"
              min="10"
              max={wallet?.balance || 0}
            />
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
            Minimum withdrawal: $10.00
          </p>
          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            onClick={handleWithdraw}
            disabled={isWithdrawing || (wallet?.balance || 0) < 10}
          >
            {isWithdrawing ? 'Processing...' : 'Withdraw'}
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Transaction History</h3>
        
        {txLoading ? (
          <div className="loading">Loading...</div>
        ) : transactions.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Balance</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>
                    {getTransactionIcon(tx.type)}{' '}
                    <span style={{ textTransform: 'capitalize' }}>{tx.type}</span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {tx.description || '-'}
                  </td>
                  <td style={{ color: tx.amount >= 0 ? 'var(--secondary)' : 'var(--danger)', fontWeight: 'bold' }}>
                    {tx.amount >= 0 ? '+' : ''}{tx.amount.toFixed(2)}
                  </td>
                  <td>${tx.balanceAfter.toFixed(2)}</td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">No transactions yet</div>
        )}
      </div>
    </div>
  );
}

export default WalletPage;
