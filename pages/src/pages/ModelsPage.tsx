import { useState } from 'react';
import { useModels, useCategories } from '../hooks/useApi';
import ModelCard from '../components/ModelCard';
import type { GptModel, Category } from '../types';

function ModelsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [page, setPage] = useState(1);
  
  const { data: modelsData, isLoading: modelsLoading } = useModels({ 
    category: selectedCategory || undefined,
    page 
  });
  const { data: categoriesData } = useCategories();

  const models = (modelsData as { models: GptModel[]; pagination: { totalPages: number; hasNext: boolean; hasPrev: boolean } })?.models || [];
  const pagination = (modelsData as { pagination: { totalPages: number; hasNext: boolean; hasPrev: boolean } })?.pagination;
  const categories = (categoriesData as { categories: Category[] })?.categories || [];

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1>AI Models Marketplace</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Browse and rent powerful AI models for your projects
        </p>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button
          className={`btn ${!selectedCategory ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSelectedCategory('')}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            className={`btn ${selectedCategory === category.slug ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedCategory(category.slug)}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Models Grid */}
      {modelsLoading ? (
        <div className="loading">Loading models...</div>
      ) : models.length > 0 ? (
        <>
          <div className="grid grid-cols-4">
            {models.map((model) => (
              <ModelCard key={model.id} model={model} />
            ))}
          </div>

          {/* Pagination */}
          {pagination && (
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={!pagination.hasPrev}
              >
                Previous
              </button>
              <span style={{ padding: '0.5rem 1rem' }}>
                Page {page} of {pagination.totalPages}
              </span>
              <button
                className="btn btn-secondary"
                onClick={() => setPage(p => p + 1)}
                disabled={!pagination.hasNext}
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          <p>No models found</p>
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

export default ModelsPage;
