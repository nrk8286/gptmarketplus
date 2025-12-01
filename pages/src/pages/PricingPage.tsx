import { Link } from 'react-router-dom';
import { useSubscriptionPlans } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import type { SubscriptionPlan } from '../types';

function PricingPage() {
  const { isAuthenticated } = useAuth();
  const { data, isLoading } = useSubscriptionPlans();

  const plans = (data as { plans: SubscriptionPlan[] })?.plans || [];

  // Default plans if none from API
  const defaultPlans: SubscriptionPlan[] = [
    {
      id: 'free',
      name: 'Free',
      description: 'Get started with basic features',
      tier: 'free',
      priceMonthly: 0,
      priceYearly: null,
      features: ['5 API calls/month', 'Basic model access', 'Community support'],
      apiCallsLimit: 5,
      modelsAccessLimit: 3,
      storageLimitMb: 100,
      prioritySupport: false,
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'Best for professionals',
      tier: 'pro',
      priceMonthly: 29,
      priceYearly: 290,
      features: ['1,000 API calls/month', 'All model access', 'Priority support', 'Custom integrations', 'Analytics dashboard'],
      apiCallsLimit: 1000,
      modelsAccessLimit: 100,
      storageLimitMb: 10000,
      prioritySupport: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For teams and organizations',
      tier: 'enterprise',
      priceMonthly: 99,
      priceYearly: 990,
      features: ['Unlimited API calls', 'All model access', '24/7 support', 'Custom integrations', 'Advanced analytics', 'Dedicated account manager', 'SLA guarantee'],
      apiCallsLimit: 0,
      modelsAccessLimit: 0,
      storageLimitMb: 0,
      prioritySupport: true,
    },
  ];

  const displayPlans = plans.length > 0 ? plans : defaultPlans;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1>Simple, Transparent Pricing</h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '1rem auto' }}>
          Choose the plan that best fits your needs. All plans include access to our marketplace and prediction markets.
        </p>
      </div>

      {isLoading ? (
        <div className="loading">Loading plans...</div>
      ) : (
        <div className="pricing-grid">
          {displayPlans.map((plan, index) => (
            <div 
              key={plan.id} 
              className={`card pricing-card ${index === 1 ? 'featured' : ''}`}
            >
              {index === 1 && <span className="pricing-badge">Most Popular</span>}
              
              <h2 className="pricing-name">{plan.name}</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{plan.description}</p>
              
              <div className="pricing-price">
                ${plan.priceMonthly}
                <span>/month</span>
              </div>
              
              {plan.priceYearly && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  or ${plan.priceYearly}/year (save ${plan.priceMonthly * 12 - plan.priceYearly})
                </p>
              )}

              <ul className="pricing-features">
                {plan.features.map((feature, i) => (
                  <li key={i}>{feature}</li>
                ))}
              </ul>

              <Link 
                to={isAuthenticated ? '/dashboard' : '/register'} 
                className={`btn ${index === 1 ? 'btn-primary' : 'btn-secondary'} btn-lg`}
                style={{ width: '100%' }}
              >
                {plan.priceMonthly === 0 ? 'Get Started' : 'Subscribe'}
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* API Pricing */}
      <div className="card" style={{ marginTop: '3rem', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '1rem' }}>Pay-Per-Use API Pricing</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Need more flexibility? Pay only for what you use with our API pricing.
        </p>
        
        <div className="grid grid-cols-3">
          <div className="card" style={{ background: 'var(--bg-tertiary)' }}>
            <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>$0.001</h3>
            <p style={{ color: 'var(--text-secondary)' }}>per API request</p>
          </div>
          <div className="card" style={{ background: 'var(--bg-tertiary)' }}>
            <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>20%</h3>
            <p style={{ color: 'var(--text-secondary)' }}>platform fee on rentals</p>
          </div>
          <div className="card" style={{ background: 'var(--bg-tertiary)' }}>
            <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>2%</h3>
            <p style={{ color: 'var(--text-secondary)' }}>trading fee on markets</p>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ marginTop: '3rem' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Frequently Asked Questions</h2>
        
        <div className="grid grid-cols-2">
          <div className="card">
            <h3 style={{ marginBottom: '0.5rem' }}>Can I cancel anytime?</h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Yes, you can cancel your subscription at any time. You will retain access until the end of your billing period.
            </p>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: '0.5rem' }}>What payment methods do you accept?</h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              We accept all major credit cards, debit cards, and support wallet payments within the platform.
            </p>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: '0.5rem' }}>How do model rentals work?</h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Rent AI models by the hour, day, or month. Each rental gives you API access to use the model within your applications.
            </p>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: '0.5rem' }}>What are prediction markets?</h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Trade on future outcomes! Buy shares in outcomes you believe will happen and earn when you are right.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PricingPage;
