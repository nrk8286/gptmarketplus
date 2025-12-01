import { Link } from 'react-router-dom';
import { useFeaturedModels, useMarkets } from '../hooks/useApi';
import ModelCard from '../components/ModelCard';
import MarketCard from '../components/MarketCard';
import type { GptModel, PredictionMarket } from '../types';

function HomePage() {
  const { data: modelsData, isLoading: modelsLoading } = useFeaturedModels();
  const { data: marketsData, isLoading: marketsLoading } = useMarkets({ featured: true, status: 'open' });

  const models = (modelsData as { models: GptModel[] })?.models || [];
  const markets = (marketsData as { markets: PredictionMarket[] })?.markets || [];

  return (
    <div>
      {/* Hero Section */}
      <section className="hero">
        <h1 className="hero-title">
          The Premier <span>AI Marketplace</span>
        </h1>
        <p className="hero-subtitle">
          Rent GPT models, subscribe to AI services, and trade in prediction markets. 
          Unlock the power of AI for your business.
        </p>
        <div className="hero-actions">
          <Link to="/models" className="btn btn-primary btn-lg">Explore Models</Link>
          <Link to="/markets" className="btn btn-secondary btn-lg">Trade Markets</Link>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">500+</div>
          <div className="stat-label">AI Models</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">10K+</div>
          <div className="stat-label">Active Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">$1M+</div>
          <div className="stat-label">Trading Volume</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">99.9%</div>
          <div className="stat-label">Uptime</div>
        </div>
      </section>

      {/* Featured Models */}
      <section style={{ marginBottom: '4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2>Featured Models</h2>
          <Link to="/models" className="btn btn-secondary">View All</Link>
        </div>
        
        {modelsLoading ? (
          <div className="loading">Loading models...</div>
        ) : models.length > 0 ? (
          <div className="grid grid-cols-4">
            {models.slice(0, 4).map((model) => (
              <ModelCard key={model.id} model={model} />
            ))}
          </div>
        ) : (
          <div className="empty-state">No featured models available</div>
        )}
      </section>

      {/* Active Markets */}
      <section style={{ marginBottom: '4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2>Active Prediction Markets</h2>
          <Link to="/markets" className="btn btn-secondary">View All</Link>
        </div>
        
        {marketsLoading ? (
          <div className="loading">Loading markets...</div>
        ) : markets.length > 0 ? (
          <div className="grid grid-cols-3">
            {markets.slice(0, 3).map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
        ) : (
          <div className="empty-state">No active markets available</div>
        )}
      </section>

      {/* CTA Section */}
      <section className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Ready to Get Started?</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Join thousands of users already using GPT Marketplace Plus to access cutting-edge AI capabilities.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link to="/register" className="btn btn-primary btn-lg">Create Account</Link>
          <Link to="/pricing" className="btn btn-secondary btn-lg">View Pricing</Link>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
