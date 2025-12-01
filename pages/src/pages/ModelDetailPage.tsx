import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useModel } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import type { GptModel, PricingTier } from '../types';

function ModelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data, isLoading, error } = useModel(id || '');
  
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);
  const [rentalType, setRentalType] = useState<'hourly' | 'daily' | 'monthly'>('monthly');
  const [isRenting, setIsRenting] = useState(false);
  const [rentError, setRentError] = useState<string | null>(null);

  const model = data as GptModel | null;

  const handleRent = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!selectedTier) {
      setRentError('Please select a pricing tier');
      return;
    }

    setIsRenting(true);
    setRentError(null);

    try {
      const response = await api.createRental(id!, selectedTier.id, rentalType, 'wallet');
      if (response.success) {
        navigate('/dashboard');
      } else {
        setRentError(response.error || 'Failed to create rental');
      }
    } catch {
      setRentError('An error occurred');
    } finally {
      setIsRenting(false);
    }
  };

  if (isLoading) {
    return <div className="loading">Loading model...</div>;
  }

  if (error || !model) {
    return <div className="empty-state">Model not found</div>;
  }

  const getPrice = (tier: PricingTier) => {
    switch (rentalType) {
      case 'hourly':
        return tier.pricePerHour;
      case 'daily':
        return tier.pricePerDay;
      case 'monthly':
        return tier.pricePerMonth;
      default:
        return tier.pricePerMonth;
    }
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Model Info */}
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            {model.thumbnailUrl && (
              <img 
                src={model.thumbnailUrl} 
                alt={model.name} 
                style={{ width: '100%', height: '300px', objectFit: 'cover', borderRadius: '0.5rem', marginBottom: '1.5rem' }}
              />
            )}
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <span className="badge" style={{ background: 'var(--primary)', color: 'white' }}>{model.category}</span>
              {model.isVerified && <span className="badge badge-success">Verified</span>}
              {model.isFeatured && <span className="badge badge-warning">Featured</span>}
            </div>

            <h1 style={{ marginBottom: '0.5rem' }}>{model.name}</h1>
            
            {model.creator && (
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                by {model.creator.displayName || model.creator.username}
              </p>
            )}

            <p style={{ marginBottom: '1.5rem' }}>{model.description || model.shortDescription}</p>

            <div style={{ display: 'flex', gap: '2rem', color: 'var(--text-secondary)' }}>
              <span>⭐ {model.averageRating?.toFixed(1) || 'N/A'} ({model.ratingCount || 0} reviews)</span>
              <span>📊 {model.totalRentals || 0} rentals</span>
              <span>🔧 {model.modelType}</span>
            </div>
          </div>

          {/* Documentation */}
          {model.documentationUrl && (
            <div className="card">
              <h3 style={{ marginBottom: '1rem' }}>Documentation</h3>
              <a href={model.documentationUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                View Documentation →
              </a>
            </div>
          )}
        </div>

        {/* Pricing */}
        <div>
          <div className="card" style={{ position: 'sticky', top: '1rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Rent this Model</h3>

            {/* Rental Type */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Rental Period</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(['hourly', 'daily', 'monthly'] as const).map((type) => (
                  <button
                    key={type}
                    className={`btn ${rentalType === type ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setRentalType(type)}
                    style={{ flex: 1, textTransform: 'capitalize' }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Pricing Tiers */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Select Plan</label>
              {model.pricingTiers?.map((tier) => (
                <div
                  key={tier.id}
                  onClick={() => setSelectedTier(tier)}
                  style={{
                    padding: '1rem',
                    border: `2px solid ${selectedTier?.id === tier.id ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: '0.5rem',
                    marginBottom: '0.5rem',
                    cursor: 'pointer',
                    background: selectedTier?.id === tier.id ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <strong>{tier.name}</strong>
                    <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                      ${getPrice(tier).toFixed(2)}/{rentalType === 'hourly' ? 'hr' : rentalType === 'daily' ? 'day' : 'mo'}
                    </span>
                  </div>
                  {tier.description && (
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      {tier.description}
                    </p>
                  )}
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {tier.includedRequests > 0 && <span>{tier.includedRequests.toLocaleString()} requests included • </span>}
                    <span>{tier.maxConcurrentUsers} concurrent user{tier.maxConcurrentUsers > 1 ? 's' : ''}</span>
                  </div>
                </div>
              ))}

              {(!model.pricingTiers || model.pricingTiers.length === 0) && (
                <p style={{ color: 'var(--text-muted)' }}>No pricing tiers available</p>
              )}
            </div>

            {rentError && (
              <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{rentError}</div>
            )}

            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              onClick={handleRent}
              disabled={isRenting || !selectedTier}
            >
              {isRenting ? 'Processing...' : isAuthenticated ? 'Rent Now' : 'Login to Rent'}
            </button>

            {selectedTier && (
              <p style={{ textAlign: 'center', marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Total: ${getPrice(selectedTier).toFixed(2)} (billed {rentalType})
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModelDetailPage;
