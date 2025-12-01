// Payments/Wallet API handlers

import type { RequestContext } from '../types/env.js';
import {
  errorResponse,
  successResponse,
  parseQueryParams,
  getPaginationParams,
} from '../utils/helpers.js';
import { updateUserWallet, createPayment } from '../services/database.js';

export async function handleGetWallet(
  request: Request,
  ctx: RequestContext
): Promise<Response> {
  if (!ctx.user) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const user = await ctx.env.DB.prepare(`
      SELECT wallet_balance FROM users WHERE id = ?
    `).bind(ctx.user.id).first();

    if (!user) {
      return errorResponse('User not found', 404);
    }

    return successResponse({
      balance: user.wallet_balance,
      currency: 'USD',
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    return errorResponse('Failed to get wallet', 500);
  }
}

export async function handleGetWalletTransactions(
  request: Request,
  ctx: RequestContext
): Promise<Response> {
  if (!ctx.user) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const url = new URL(request.url);
    const params = parseQueryParams(url);
    const { page, limit, offset } = getPaginationParams(params);

    // Get count
    const countResult = await ctx.env.DB.prepare(`
      SELECT COUNT(*) as count FROM wallet_transactions WHERE user_id = ?
    `).bind(ctx.user.id).first();
    const total = (countResult?.count as number) || 0;

    // Get transactions
    const result = await ctx.env.DB.prepare(`
      SELECT * FROM wallet_transactions 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `).bind(ctx.user.id, limit, offset).all();

    return successResponse({
      transactions: (result.results || []).map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        balanceBefore: tx.balance_before,
        balanceAfter: tx.balance_after,
        description: tx.description,
        referenceType: tx.reference_type,
        referenceId: tx.reference_id,
        createdAt: tx.created_at,
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
    console.error('Get wallet transactions error:', error);
    return errorResponse('Failed to get transactions', 500);
  }
}

export async function handleAddFunds(
  request: Request,
  ctx: RequestContext
): Promise<Response> {
  if (!ctx.user) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const body = await request.json() as { amount?: number };
    const { amount } = body;

    if (!amount || amount <= 0) {
      return errorResponse('Amount must be a positive number', 400);
    }

    if (amount > 10000) {
      return errorResponse('Maximum deposit is $10,000', 400);
    }

    // In production, this would integrate with Stripe to process the payment
    // For now, we'll simulate a successful payment

    // Create payment record
    const paymentId = await createPayment(ctx.env.DB, {
      userId: ctx.user.id,
      amount,
      description: 'Wallet deposit',
      metadata: { type: 'deposit' },
    });

    // Mark payment as succeeded (in production, this would happen via webhook)
    await ctx.env.DB.prepare(`
      UPDATE payments SET status = 'succeeded' WHERE id = ?
    `).bind(paymentId).run();

    // Add funds to wallet
    await updateUserWallet(
      ctx.env.DB,
      ctx.user.id,
      amount,
      'deposit',
      'Wallet deposit',
      'payment',
      paymentId
    );

    // Get new balance
    const user = await ctx.env.DB.prepare(`
      SELECT wallet_balance FROM users WHERE id = ?
    `).bind(ctx.user.id).first();

    return successResponse({
      paymentId,
      amount,
      newBalance: user?.wallet_balance,
    }, 'Funds added successfully', 201);
  } catch (error) {
    console.error('Add funds error:', error);
    return errorResponse('Failed to add funds', 500);
  }
}

export async function handleWithdrawFunds(
  request: Request,
  ctx: RequestContext
): Promise<Response> {
  if (!ctx.user) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const body = await request.json() as { amount?: number };
    const { amount } = body;

    if (!amount || amount <= 0) {
      return errorResponse('Amount must be a positive number', 400);
    }

    const MINIMUM_WITHDRAWAL = 10;
    if (amount < MINIMUM_WITHDRAWAL) {
      return errorResponse(`Minimum withdrawal is $${MINIMUM_WITHDRAWAL}`, 400);
    }

    // Check balance
    const user = await ctx.env.DB.prepare(`
      SELECT wallet_balance FROM users WHERE id = ?
    `).bind(ctx.user.id).first();

    const balance = (user?.wallet_balance as number) || 0;
    if (balance < amount) {
      return errorResponse('Insufficient balance', 400);
    }

    // Deduct from wallet (in production, actual transfer would happen)
    await updateUserWallet(
      ctx.env.DB,
      ctx.user.id,
      -amount,
      'withdrawal',
      'Wallet withdrawal',
      'withdrawal',
      undefined
    );

    // Get new balance
    const updatedUser = await ctx.env.DB.prepare(`
      SELECT wallet_balance FROM users WHERE id = ?
    `).bind(ctx.user.id).first();

    return successResponse({
      amount,
      newBalance: updatedUser?.wallet_balance,
      message: 'Withdrawal initiated. Funds will be transferred within 2-3 business days.',
    });
  } catch (error) {
    console.error('Withdraw funds error:', error);
    return errorResponse('Failed to withdraw funds', 500);
  }
}

export async function handleGetPaymentHistory(
  request: Request,
  ctx: RequestContext
): Promise<Response> {
  if (!ctx.user) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const url = new URL(request.url);
    const params = parseQueryParams(url);
    const { page, limit, offset } = getPaginationParams(params);

    // Get count
    const countResult = await ctx.env.DB.prepare(`
      SELECT COUNT(*) as count FROM payments WHERE user_id = ?
    `).bind(ctx.user.id).first();
    const total = (countResult?.count as number) || 0;

    // Get payments
    const result = await ctx.env.DB.prepare(`
      SELECT * FROM payments 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `).bind(ctx.user.id, limit, offset).all();

    return successResponse({
      payments: (result.results || []).map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        paymentMethod: payment.payment_method,
        description: payment.description,
        refundedAmount: payment.refunded_amount,
        createdAt: payment.created_at,
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
    console.error('Get payment history error:', error);
    return errorResponse('Failed to get payment history', 500);
  }
}
