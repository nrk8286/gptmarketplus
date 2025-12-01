// Subscriptions API handlers

import type { RequestContext } from '../types/env.js';
import {
  errorResponse,
  successResponse,
} from '../utils/helpers.js';
import {
  getSubscriptionPlans,
  getUserSubscription,
  createSubscription,
} from '../services/database.js';

export async function handleListSubscriptionPlans(
  request: Request,
  ctx: RequestContext
): Promise<Response> {
  try {
    const plans = await getSubscriptionPlans(ctx.env.DB);

    return successResponse({
      plans: plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        tier: plan.tier,
        priceMonthly: plan.price_monthly,
        priceYearly: plan.price_yearly,
        features: JSON.parse((plan.features as string) || '[]'),
        apiCallsLimit: plan.api_calls_limit,
        modelsAccessLimit: plan.models_access_limit,
        storageLimitMb: plan.storage_limit_mb,
        prioritySupport: Boolean(plan.priority_support),
      })),
    });
  } catch (error) {
    console.error('List subscription plans error:', error);
    return errorResponse('Failed to list subscription plans', 500);
  }
}

export async function handleGetUserSubscription(
  request: Request,
  ctx: RequestContext
): Promise<Response> {
  if (!ctx.user) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const subscription = await getUserSubscription(ctx.env.DB, ctx.user.id);

    if (!subscription) {
      return successResponse({ subscription: null });
    }

    return successResponse({
      subscription: {
        id: subscription.id,
        planId: subscription.plan_id,
        planName: subscription.plan_name,
        tier: subscription.tier,
        status: subscription.status,
        billingCycle: subscription.billing_cycle,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
        features: JSON.parse((subscription.features as string) || '[]'),
      },
    });
  } catch (error) {
    console.error('Get user subscription error:', error);
    return errorResponse('Failed to get subscription', 500);
  }
}

export async function handleCreateSubscription(
  request: Request,
  ctx: RequestContext
): Promise<Response> {
  if (!ctx.user) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const body = await request.json() as {
      planId?: string;
      billingCycle?: 'monthly' | 'yearly';
    };

    const { planId, billingCycle = 'monthly' } = body;

    if (!planId) {
      return errorResponse('Plan ID is required', 400);
    }

    // Check if user already has an active subscription
    const existingSubscription = await getUserSubscription(ctx.env.DB, ctx.user.id);
    if (existingSubscription) {
      return errorResponse('User already has an active subscription', 400);
    }

    // Get plan details
    const plan = await ctx.env.DB.prepare(`
      SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1
    `).bind(planId).first();

    if (!plan) {
      return errorResponse('Subscription plan not found', 404);
    }

    // Calculate period
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Create subscription (in production, this would integrate with Stripe)
    const subscriptionId = await createSubscription(ctx.env.DB, {
      userId: ctx.user.id,
      planId,
      billingCycle,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
    });

    return successResponse(
      {
        id: subscriptionId,
        planId,
        planName: plan.name,
        billingCycle,
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: periodEnd.toISOString(),
        status: 'active',
      },
      'Subscription created successfully',
      201
    );
  } catch (error) {
    console.error('Create subscription error:', error);
    return errorResponse('Failed to create subscription', 500);
  }
}

export async function handleCancelSubscription(
  request: Request,
  ctx: RequestContext
): Promise<Response> {
  if (!ctx.user) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const subscription = await getUserSubscription(ctx.env.DB, ctx.user.id);
    if (!subscription) {
      return errorResponse('No active subscription found', 404);
    }

    // Mark subscription to cancel at period end
    await ctx.env.DB.prepare(`
      UPDATE user_subscriptions 
      SET cancel_at_period_end = 1, updated_at = datetime('now')
      WHERE id = ?
    `).bind(subscription.id).run();

    return successResponse(
      { cancelAtPeriodEnd: true, currentPeriodEnd: subscription.current_period_end },
      'Subscription will be cancelled at the end of the current period'
    );
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return errorResponse('Failed to cancel subscription', 500);
  }
}
