import { Link } from 'react-router-dom';
import type { GptModel } from '../types';

interface ModelCardProps {
  model: GptModel;
}

function ModelCard({ model }: ModelCardProps) {
  return (
    <Link to={`/models/${model.id}`} className="card model-card">
      {model.thumbnailUrl ? (
        <img src={model.thumbnailUrl} alt={model.name} className="model-card-image" />
      ) : (
        <div className="model-card-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          No Image
        </div>
      )}
      
      <span className="model-card-category">{model.category}</span>
      
      {model.isVerified && (
        <span className="badge badge-success" style={{ marginLeft: '0.5rem' }}>Verified</span>
      )}
      
      <h3 className="model-card-title">{model.name}</h3>
      <p className="model-card-description">{model.shortDescription || 'No description available'}</p>
      
      <div className="model-card-stats">
        <span>⭐ {model.averageRating?.toFixed(1) || 'N/A'}</span>
        <span>📊 {model.totalRentals || 0} rentals</span>
      </div>
    </Link>
  );
}

export default ModelCard;
