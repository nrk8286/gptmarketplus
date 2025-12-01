// Rentals API handlers

import type { RequestContext } from '../types/env.js';
import {
  errorResponse,
  successResponse,
  generateId,
} from '../utils/helpers.js';
import {
  createRental,
  getUserRentals,
  getGptModelById,
  createPayment,
  updateUserWallet,
} from '../services/database.js';

// Platform fee percentage for rentals
const PLATFORM_FEE_PERCENTAGE = 0.20; // 20% platform fee

export async function handleCreateRental(
  request: Request,
  ctx: RequestContext
): Promise<Response> {
  if (!ctx.user) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const body = await request.json() as {
      modelId?: string;
      pricingTierId?: string;
      rentalType?: 'hourly' | 'daily' | 'monthly' | 'pay_per_use';
      paymentMethod?: string;
    };

    const { modelId, pricingTierId, rentalType, paymentMethod } = body;

    if (!modelId || !pricingTierId || !rentalType) {
      return errorResponse('Model ID, pricing tier, and rental type are required', 400);
    }

    // Get model and pricing tier
    const model = await getGptModelById(ctx.env.DB, modelId);
    if (!model) {
      return errorResponse('Model not found', 404);
    }

    const tierResult = await ctx.env.DB.prepare(`
      SELECT * FROM gpt_pricing_tiers WHERE id = ? AND model_id = ? AND is_active = 1
    `).bind(pricingTierId, modelId).first();

    if (!tierResult) {
      return errorResponse('Pricing tier not found', 404);
    }

    // Calculate cost based on rental type
    let totalCost = 0;
    let endsAt: string | undefined;
    const startsAt = new Date().toISOString();

    switch (rentalType) {
      case 'hourly':
        totalCost = tierResult.price_per_hour as number;
        endsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        break;
      case 'daily':
        totalCost = tierResult.price_per_day as number;
        endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'monthly':
        totalCost = tierResult.price_per_month as number;
        endsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'pay_per_use':
        totalCost = 0; // Charged per request
        break;
    }

    // Process payment based on method
    let paymentId: string | undefined;

    if (paymentMethod === 'wallet' && totalCost > 0) {
      // Check wallet balance
      const userResult = await ctx.env.DB.prepare(`
        SELECT wallet_balance FROM users WHERE id = ?
      `).bind(ctx.user.id).first();

      const walletBalance = (userResult?.wallet_balance as number) || 0;
      if (walletBalance < totalCost) {
        return errorResponse('Insufficient wallet balance', 400);
      }

      // Deduct from wallet
      await updateUserWallet(
        ctx.env.DB,
        ctx.user.id,
        -totalCost,
        'rental',
        `Rental payment for ${model.name}`,
        'rental',
        modelId
      );

      // Create payment record
      paymentId = await createPayment(ctx.env.DB, {
        userId: ctx.user.id,
        amount: totalCost,
        description: `Rental: ${model.name} - ${rentalType}`,
        metadata: { modelId, rentalType, pricingTierId },
      });

      await ctx.env.DB.prepare(`
        UPDATE payments SET status = 'succeeded' WHERE id = ?
      `).bind(paymentId).run();

      // Create revenue share for creator
      const creatorAmount = totalCost * (1 - PLATFORM_FEE_PERCENTAGE);
      const platformFee = totalCost * PLATFORM_FEE_PERCENTAGE;

      await ctx.env.DB.prepare(`
        INSERT INTO revenue_shares (id, payment_id, creator_id, gross_amount, platform_fee, creator_amount, status)
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `).bind(
        generateId(),
        paymentId,
        model.creator_id,
        totalCost,
        platformFee,
        creatorAmount
      ).run();

      // Credit creator wallet
      await updateUserWallet(
        ctx.env.DB,
        model.creator_id as string,
        creatorAmount,
        'payout',
        `Revenue from ${model.name} rental`,
        'rental',
        modelId
      );
    } else if (totalCost > 0) {
      // Stripe payment would be processed here
      return errorResponse('Stripe payment not yet implemented. Please use wallet.', 400);
    }

    // Create rental
    const rentalId = await createRental(ctx.env.DB, {
      userId: ctx.user.id,
      modelId,
      pricingTierId,
      rentalType,
      startsAt,
      endsAt,
      totalCost,
      requestsLimit: tierResult.included_requests as number || undefined,
      paymentId,
    });

    return successResponse(
      {
        id: rentalId,
        modelId,
        rentalType,
        startsAt,
        endsAt,
        totalCost,
        status: 'active',
      },
      'Rental created successfully',
      201
    );
  } catch (error) {
    console.error('Create rental error:', error);
    return errorResponse('Failed to create rental', 500);
  }
}

export async function handleListUserRentals(
  request: Request,
  ctx: RequestContext
): Promise<Response> {
  if (!ctx.user) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || undefined;

    const rentals = await getUserRentals(ctx.env.DB, ctx.user.id, status);

    return successResponse({
      rentals: rentals.map((rental) => ({
        id: rental.id,
        modelId: rental.model_id,
        modelName: rental.model_name,
        thumbnailUrl: rental.thumbnail_url,
        status: rental.status,
        rentalType: rental.rental_type,
        startsAt: rental.starts_at,
        endsAt: rental.ends_at,
        totalCost: rental.total_cost,
        requestsUsed: rental.requests_used,
        requestsLimit: rental.requests_limit,
        autoRenew: Boolean(rental.auto_renew),
        createdAt: rental.created_at,
      })),
    });
  } catch (error) {
    console.error('List rentals error:', error);
    return errorResponse('Failed to list rentals', 500);
  }
}

export async function handleGetRental(
  request: Request,
  ctx: RequestContext
): Promise<Response> {
  if (!ctx.user) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const rentalId = pathParts[pathParts.length - 1];

    const rental = await ctx.env.DB.prepare(`
      SELECT r.*, m.name as model_name, m.thumbnail_url, m.api_endpoint
      FROM gpt_rentals r
      JOIN gpt_models m ON r.model_id = m.id
      WHERE r.id = ? AND r.user_id = ?
    `).bind(rentalId, ctx.user.id).first();

    if (!rental) {
      return errorResponse('Rental not found', 404);
    }

    // Get usage stats
    const usageResult = await ctx.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_requests,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        SUM(cost) as total_cost
      FROM gpt_usage_logs WHERE rental_id = ?
    `).bind(rentalId).first();

    return successResponse({
      id: rental.id,
      modelId: rental.model_id,
      modelName: rental.model_name,
      thumbnailUrl: rental.thumbnail_url,
      apiEndpoint: rental.api_endpoint,
      status: rental.status,
      rentalType: rental.rental_type,
      startsAt: rental.starts_at,
      endsAt: rental.ends_at,
      totalCost: rental.total_cost,
      requestsUsed: rental.requests_used,
      requestsLimit: rental.requests_limit,
      autoRenew: Boolean(rental.auto_renew),
      usage: {
        totalRequests: usageResult?.total_requests || 0,
        totalInputTokens: usageResult?.total_input_tokens || 0,
        totalOutputTokens: usageResult?.total_output_tokens || 0,
        totalCost: usageResult?.total_cost || 0,
      },
      createdAt: rental.created_at,
    });
  } catch (error) {
    console.error('Get rental error:', error);
    return errorResponse('Failed to get rental', 500);
  }
}

export async function handleCancelRental(
  request: Request,
  ctx: RequestContext
): Promise<Response> {
  if (!ctx.user) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const rentalId = pathParts[pathParts.length - 2]; // .../rentals/{id}/cancel

    const rental = await ctx.env.DB.prepare(`
      SELECT * FROM gpt_rentals WHERE id = ? AND user_id = ?
    `).bind(rentalId, ctx.user.id).first();

    if (!rental) {
      return errorResponse('Rental not found', 404);
    }

    if (rental.status !== 'active') {
      return errorResponse('Rental is not active', 400);
    }

    await ctx.env.DB.prepare(`
      UPDATE gpt_rentals SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?
    `).bind(rentalId).run();

    return successResponse(null, 'Rental cancelled successfully');
  } catch (error) {
    console.error('Cancel rental error:', error);
    return errorResponse('Failed to cancel rental', 500);
  }
}
