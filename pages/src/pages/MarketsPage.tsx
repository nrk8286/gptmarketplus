import { useState } from 'react';
import { useMarkets } from '../hooks/useApi';
import MarketCard from '../components/MarketCard';
import type { PredictionMarket } from '../types';

const MARKET_CATEGORIES = [
  'Technology',
  'Finance',
  'Politics',
  'Sports',
  'Entertainment',
  'Science',
  'Crypto',
  'AI',
];

function MarketsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('open');
  
  const { data, isLoading } = useMarkets({ 
    category: selectedCategory || undefined,
    status: selectedStatus || 'open'
  });

  const markets = (data as { markets: PredictionMarket[] })?.markets || [];

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1>Prediction Markets</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Trade on future outcomes and earn from your predictions
        </p>
      </div>

      {/* Status Filters */}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
        {['open', 'closed', 'resolved'].map((status) => (
          <button
            key={status}
            className={`btn ${selectedStatus === status ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedStatus(status)}
            style={{ textTransform: 'capitalize' }}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Category Filters */}
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          className={`btn ${!selectedCategory ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSelectedCategory('')}
        >
          All Categories
        </button>
        {MARKET_CATEGORIES.map((category) => (
          <button
            key={category}
            className={`btn ${selectedCategory === category ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Markets Grid */}
      {isLoading ? (
        <div className="loading">Loading markets...</div>
      ) : markets.length > 0 ? (
        <div className="grid grid-cols-3">
          {markets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No markets found</p>
          {selectedCategory && (
            <button className="btn btn-secondary" onClick={() => setSelectedCategory('')}>
              Clear filter
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default MarketsPage;
