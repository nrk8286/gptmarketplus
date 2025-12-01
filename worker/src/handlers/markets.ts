// Prediction Markets API handlers

import type { RequestContext } from '../types/env.js';
import {
  parseQueryParams,
  getPaginationParams,
  errorResponse,
  successResponse,
  sanitizeString,
  generateId,
} from '../utils/helpers.js';
import {
  createPredictionMarket,
  getPredictionMarkets,
  updateUserWallet,
} from '../services/database.js';

// Platform fee for market trades
const MARKET_TRADING_FEE_PERCENTAGE = 0.02; // 2% trading fee

export async function handleListMarkets(
  request: Request,
  ctx: RequestContext
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const params = parseQueryParams(url);
    const { page, limit, offset } = getPaginationParams(params);

    const { markets, total } = await getPredictionMarkets(ctx.env.DB, {
      category: params.category,
      status: params.status || 'open',
      isFeatured: params.featured === 'true' ? true : undefined,
      limit,
      offset,
    });

    return successResponse({
      markets: markets.map((market) => ({
        id: market.id,
        title: market.title,
        description: market.description,
        category: market.category,
        marketType: market.market_type,
        outcomes: JSON.parse((market.outcomes as string) || '[]'),
        currentLiquidity: market.current_liquidity,
        tradingVolume: market.trading_volume,
        status: market.status,
        resolvesAt: market.resolves_at,
        isFeatured: Boolean(market.is_featured),
        createdAt: market.created_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('List markets error:', error);
    return errorResponse('Failed to list markets', 500);
  }
}

export async function handleGetMarket(
  request: Request,
  ctx: RequestContext
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const marketId = pathParts[pathParts.length - 1];

    if (!marketId) {
      return errorResponse('Market ID is required', 400);
    }

    const market = await ctx.env.DB.prepare(`
      SELECT m.*, u.username as creator_username
      FROM prediction_markets m
      JOIN users u ON m.creator_id = u.id
      WHERE m.id = ?
    `).bind(marketId).first();

    if (!market) {
      return errorResponse('Market not found', 404);
    }

    // Get outcomes with current prices
    const outcomesResult = await ctx.env.DB.prepare(`
      SELECT * FROM market_outcomes WHERE market_id = ?
    `).bind(marketId).all();

    // Get recent trades
    const tradesResult = await ctx.env.DB.prepare(`
      SELECT t.*, u.username
      FROM market_trades t
      JOIN users u ON t.user_id = u.id
      WHERE t.market_id = ?
      ORDER BY t.created_at DESC
      LIMIT 20
    `).bind(marketId).all();

    return successResponse({
      id: market.id,
      title: market.title,
      description: market.description,
      category: market.category,
      resolutionCriteria: market.resolution_criteria,
      marketType: market.market_type,
      currentLiquidity: market.current_liquidity,
      tradingVolume: market.trading_volume,
      status: market.status,
      resolutionSource: market.resolution_source,
      resolvesAt: market.resolves_at,
      resolvedAt: market.resolved_at,
      winningOutcome: market.winning_outcome,
      isFeatured: Boolean(market.is_featured),
      creator: { username: market.creator_username },
      outcomes: (outcomesResult.results || []).map((outcome) => ({
        id: outcome.id,
        name: outcome.name,
        description: outcome.description,
        probability: outcome.probability,
        totalShares: outcome.total_shares,
        currentPrice: outcome.current_price,
      })),
      recentTrades: (tradesResult.results || []).map((trade) => ({
        id: trade.id,
        username: trade.username,
        tradeType: trade.trade_type,
        shares: trade.shares,
        pricePerShare: trade.price_per_share,
        totalAmount: trade.total_amount,
        createdAt: trade.created_at,
      })),
      createdAt: market.created_at,
    });
  } catch (error) {
    console.error('Get market error:', error);
    return errorResponse('Failed to get market', 500);
  }
}

export async function handleCreateMarket(
  request: Request,
  ctx: RequestContext
): Promise<Response> {
  if (!ctx.user) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const body = await request.json() as {
      title?: string;
      description?: string;
      category?: string;
      resolutionCriteria?: string;
      marketType?: 'binary' | 'multiple';
      outcomes?: string[];
      initialLiquidity?: number;
      resolvesAt?: string;
    };

    const {
      title,
      description,
      category,
      resolutionCriteria,
      marketType = 'binary',
      outcomes,
      initialLiquidity = 100,
      resolvesAt,
    } = body;

    if (!title || !category || !resolutionCriteria || !resolvesAt) {
      return errorResponse('Title, category, resolution criteria, and resolution date are required', 400);
    }

    // Validate outcomes for binary vs multiple
    const marketOutcomes = outcomes || ['Yes', 'No'];
    if (marketType === 'binary' && marketOutcomes.length !== 2) {
      return errorResponse('Binary markets must have exactly 2 outcomes', 400);
    }
    if (marketType === 'multiple' && marketOutcomes.length < 2) {
      return errorResponse('Multiple outcome markets must have at least 2 outcomes', 400);
    }

    // Check wallet balance for initial liquidity
    const userResult = await ctx.env.DB.prepare(`
      SELECT wallet_balance FROM users WHERE id = ?
    `).bind(ctx.user.id).first();

    const walletBalance = (userResult?.wallet_balance as number) || 0;
    if (walletBalance < initialLiquidity) {
      return errorResponse('Insufficient wallet balance for initial liquidity', 400);
    }

    // Deduct initial liquidity from wallet
    await updateUserWallet(
      ctx.env.DB,
      ctx.user.id,
      -initialLiquidity,
      'withdrawal',
      `Initial liquidity for market: ${title}`,
      'market',
      undefined
    );

    // Create market
    const marketId = await createPredictionMarket(ctx.env.DB, {
      creatorId: ctx.user.id,
      title: sanitizeString(title),
      description: description ? sanitizeString(description) : undefined,
      category: sanitizeString(category),
      resolutionCriteria: sanitizeString(resolutionCriteria),
      marketType,
      outcomes: marketOutcomes,
      initialLiquidity,
      resolvesAt,
    });

    return successResponse({ id: marketId }, 'Market created successfully', 201);
  } catch (error) {
    console.error('Create market error:', error);
    return errorResponse('Failed to create market', 500);
  }
}

export async function handlePlaceTrade(
  request: Request,
  ctx: RequestContext
): Promise<Response> {
  if (!ctx.user) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const marketId = pathParts[pathParts.length - 2]; // .../markets/{id}/trade

    const body = await request.json() as {
      outcomeId?: string;
      tradeType?: 'buy' | 'sell';
      amount?: number;
    };

    const { outcomeId, tradeType, amount } = body;

    if (!outcomeId || !tradeType || !amount || amount <= 0) {
      return errorResponse('Outcome ID, trade type, and positive amount are required', 400);
    }

    // Get market
    const market = await ctx.env.DB.prepare(`
      SELECT * FROM prediction_markets WHERE id = ? AND status = 'open'
    `).bind(marketId).first();

    if (!market) {
      return errorResponse('Market not found or not open', 404);
    }

    // Get outcome
    const outcome = await ctx.env.DB.prepare(`
      SELECT * FROM market_outcomes WHERE id = ? AND market_id = ?
    `).bind(outcomeId, marketId).first();

    if (!outcome) {
      return errorResponse('Outcome not found', 404);
    }

    const currentPrice = outcome.current_price as number;
    const fee = amount * MARKET_TRADING_FEE_PERCENTAGE;
    const totalCost = tradeType === 'buy' ? amount + fee : amount - fee;
    const shares = amount / currentPrice;

    if (tradeType === 'buy') {
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
        'withdrawal',
        `Market trade: Buy ${shares.toFixed(2)} shares`,
        'trade',
        marketId
      );
    } else {
      // For sell, check if user has position
      const position = await ctx.env.DB.prepare(`
        SELECT * FROM market_positions WHERE user_id = ? AND outcome_id = ?
      `).bind(ctx.user.id, outcomeId).first();

      if (!position || (position.shares as number) < shares) {
        return errorResponse('Insufficient shares to sell', 400);
      }

      // Credit wallet
      await updateUserWallet(
        ctx.env.DB,
        ctx.user.id,
        totalCost,
        'deposit',
        `Market trade: Sell ${shares.toFixed(2)} shares`,
        'trade',
        marketId
      );
    }

    // Create or update position
    const existingPosition = await ctx.env.DB.prepare(`
      SELECT * FROM market_positions WHERE user_id = ? AND outcome_id = ?
    `).bind(ctx.user.id, outcomeId).first();

    let positionId: string;
    if (existingPosition) {
      positionId = existingPosition.id as string;
      const currentShares = existingPosition.shares as number;
      const newShares = tradeType === 'buy' ? currentShares + shares : currentShares - shares;

      await ctx.env.DB.prepare(`
        UPDATE market_positions 
        SET shares = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(newShares, positionId).run();
    } else {
      positionId = generateId();
      await ctx.env.DB.prepare(`
        INSERT INTO market_positions (id, user_id, market_id, outcome_id, shares, average_price, total_cost)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(positionId, ctx.user.id, marketId, outcomeId, shares, currentPrice, amount).run();
    }

    // Record trade
    const tradeId = generateId();
    await ctx.env.DB.prepare(`
      INSERT INTO market_trades (id, user_id, market_id, outcome_id, position_id, trade_type, shares, price_per_share, total_amount, fee)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(tradeId, ctx.user.id, marketId, outcomeId, positionId, tradeType, shares, currentPrice, amount, fee).run();

    // Update market volume
    await ctx.env.DB.prepare(`
      UPDATE prediction_markets 
      SET trading_volume = trading_volume + ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(amount, marketId).run();

    // Update outcome price (simplified AMM)
    const newPrice = Math.min(0.99, Math.max(0.01, currentPrice + (tradeType === 'buy' ? 0.01 : -0.01) * shares));
    await ctx.env.DB.prepare(`
      UPDATE market_outcomes 
      SET current_price = ?, probability = ?, total_shares = total_shares + ?
      WHERE id = ?
    `).bind(newPrice, newPrice, tradeType === 'buy' ? shares : -shares, outcomeId).run();

    return successResponse({
      tradeId,
      tradeType,
      shares,
      pricePerShare: currentPrice,
      totalAmount: amount,
      fee,
      newPrice,
    }, 'Trade executed successfully', 201);
  } catch (error) {
    console.error('Place trade error:', error);
    return errorResponse('Failed to execute trade', 500);
  }
}

export async function handleGetUserPositions(
  request: Request,
  ctx: RequestContext
): Promise<Response> {
  if (!ctx.user) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const result = await ctx.env.DB.prepare(`
      SELECT p.*, m.title as market_title, o.name as outcome_name, o.current_price
      FROM market_positions p
      JOIN prediction_markets m ON p.market_id = m.id
      JOIN market_outcomes o ON p.outcome_id = o.id
      WHERE p.user_id = ? AND p.shares > 0
      ORDER BY p.updated_at DESC
    `).bind(ctx.user.id).all();

    return successResponse({
      positions: (result.results || []).map((pos) => ({
        id: pos.id,
        marketId: pos.market_id,
        marketTitle: pos.market_title,
        outcomeId: pos.outcome_id,
        outcomeName: pos.outcome_name,
        shares: pos.shares,
        averagePrice: pos.average_price,
        currentPrice: pos.current_price,
        totalCost: pos.total_cost,
        currentValue: (pos.shares as number) * (pos.current_price as number),
        realizedPnl: pos.realized_pnl,
      })),
    });
  } catch (error) {
    console.error('Get positions error:', error);
    return errorResponse('Failed to get positions', 500);
  }
}
