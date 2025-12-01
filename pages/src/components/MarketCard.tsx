import { Link } from 'react-router-dom';
import type { PredictionMarket } from '../types';

interface MarketCardProps {
  market: PredictionMarket;
}

function MarketCard({ market }: MarketCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Parse outcomes - they might be strings from the API
  const displayOutcomes = market.outcomes.slice(0, 2);

  return (
    <Link to={`/markets/${market.id}`} className="card market-card">
      <span className="market-category">{market.category}</span>
      
      <h3 className="market-title">{market.title}</h3>
      
      {market.description && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          {market.description.length > 100 
            ? market.description.substring(0, 100) + '...' 
            : market.description}
        </p>
      )}
      
      <div className="market-outcomes">
        {displayOutcomes.map((outcome, index) => (
          <div key={index} className="outcome-bar">
            <span className="outcome-name">{outcome}</span>
            <div className="outcome-bar-container">
              <div 
                className="outcome-bar-fill" 
                style={{ width: '50%' }}
              />
            </div>
            <span className="outcome-percent">50%</span>
          </div>
        ))}
      </div>
      
      <div className="market-stats">
        <span>💰 {formatCurrency(market.currentLiquidity)}</span>
        <span>📈 {formatCurrency(market.tradingVolume)} volume</span>
        <span>⏰ {formatDate(market.resolvesAt)}</span>
      </div>
    </Link>
  );
}

export default MarketCard;
