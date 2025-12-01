// GPT Models API handlers

import type { RequestContext } from '../types/env.js';
import {
  parseQueryParams,
  getPaginationParams,
  errorResponse,
  successResponse,
  sanitizeString,
} from '../utils/helpers.js';
import {
  getGptModels,
  getGptModelById,
  createGptModel,
} from '../services/database.js';

export async function handleListModels(
  request: Request,
  ctx: RequestContext
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const params = parseQueryParams(url);
    const { page, limit, offset } = getPaginationParams(params);

    const { models, total } = await getGptModels(ctx.env.DB, {
      category: params.category,
      isPublic: true,
      isFeatured: params.featured === 'true' ? true : undefined,
      limit,
      offset,
      sortBy: params.sortBy || 'created_at',
      sortOrder: (params.sortOrder as 'asc' | 'desc') || 'desc',
    });

    return successResponse({
      models: models.map((model) => ({
        id: model.id,
        name: model.name,
        shortDescription: model.short_description,
        category: model.category,
        tags: JSON.parse((model.tags as string) || '[]'),
        modelType: model.model_type,
        thumbnailUrl: model.thumbnail_url,
        isVerified: Boolean(model.is_verified),
        isFeatured: Boolean(model.is_featured),
        totalRentals: model.total_rentals,
        averageRating: model.average_rating,
        ratingCount: model.rating_count,
        createdAt: model.created_at,
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
    console.error('List models error:', error);
    return errorResponse('Failed to list models', 500);
  }
}

export async function handleGetModel(
  request: Request,
  ctx: RequestContext
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const modelId = pathParts[pathParts.length - 1];

    if (!modelId) {
      return errorResponse('Model ID is required', 400);
    }

    const model = await getGptModelById(ctx.env.DB, modelId);
    if (!model) {
      return errorResponse('Model not found', 404);
    }

    // Get pricing tiers
    const tiersResult = await ctx.env.DB.prepare(`
      SELECT * FROM gpt_pricing_tiers WHERE model_id = ? AND is_active = 1
    `).bind(modelId).all();

    return successResponse({
      id: model.id,
      name: model.name,
      description: model.description,
      shortDescription: model.short_description,
      category: model.category,
      tags: JSON.parse((model.tags as string) || '[]'),
      modelType: model.model_type,
      thumbnailUrl: model.thumbnail_url,
      demoUrl: model.demo_url,
      documentationUrl: model.documentation_url,
      isVerified: Boolean(model.is_verified),
      isFeatured: Boolean(model.is_featured),
      totalRentals: model.total_rentals,
      averageRating: model.average_rating,
      ratingCount: model.rating_count,
      creator: {
        username: model.creator_username,
        displayName: model.creator_display_name,
      },
      pricingTiers: (tiersResult.results || []).map((tier) => ({
        id: tier.id,
        name: tier.name,
        description: tier.description,
        pricePerHour: tier.price_per_hour,
        pricePerDay: tier.price_per_day,
        pricePerMonth: tier.price_per_month,
        pricePerRequest: tier.price_per_request,
        includedRequests: tier.included_requests,
        maxConcurrentUsers: tier.max_concurrent_users,
        features: JSON.parse((tier.features as string) || '[]'),
      })),
      createdAt: model.created_at,
    });
  } catch (error) {
    console.error('Get model error:', error);
    return errorResponse('Failed to get model', 500);
  }
}

export async function handleCreateModel(
  request: Request,
  ctx: RequestContext
): Promise<Response> {
  if (!ctx.user) {
    return errorResponse('Unauthorized', 401);
  }

  if (!ctx.user.isCreator && !ctx.user.isAdmin) {
    return errorResponse('Only creators can publish models', 403);
  }

  try {
    const body = await request.json() as {
      name?: string;
      description?: string;
      shortDescription?: string;
      category?: string;
      tags?: string[];
      modelType?: string;
      apiEndpoint?: string;
      systemPrompt?: string;
      configuration?: Record<string, unknown>;
    };

    const { name, description, shortDescription, category, tags, modelType, apiEndpoint, systemPrompt, configuration } = body;

    if (!name || !category || !modelType) {
      return errorResponse('Name, category, and model type are required', 400);
    }

    const modelId = await createGptModel(ctx.env.DB, {
      creatorId: ctx.user.id,
      name: sanitizeString(name),
      description: description ? sanitizeString(description) : undefined,
      shortDescription: shortDescription ? sanitizeString(shortDescription) : undefined,
      category: sanitizeString(category),
      tags,
      modelType: sanitizeString(modelType),
      apiEndpoint,
      systemPrompt,
      configuration,
    });

    return successResponse({ id: modelId }, 'Model created successfully', 201);
  } catch (error) {
    console.error('Create model error:', error);
    return errorResponse('Failed to create model', 500);
  }
}

export async function handleGetFeaturedModels(
  request: Request,
  ctx: RequestContext
): Promise<Response> {
  try {
    const { models } = await getGptModels(ctx.env.DB, {
      isPublic: true,
      isFeatured: true,
      limit: 12,
    });

    return successResponse({
      models: models.map((model) => ({
        id: model.id,
        name: model.name,
        shortDescription: model.short_description,
        category: model.category,
        thumbnailUrl: model.thumbnail_url,
        averageRating: model.average_rating,
        totalRentals: model.total_rentals,
      })),
    });
  } catch (error) {
    console.error('Get featured models error:', error);
    return errorResponse('Failed to get featured models', 500);
  }
}

export async function handleGetCategories(
  request: Request,
  ctx: RequestContext
): Promise<Response> {
  try {
    const result = await ctx.env.DB.prepare(`
      SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC
    `).all();

    return successResponse({
      categories: (result.results || []).map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon,
        parentId: cat.parent_id,
      })),
    });
  } catch (error) {
    console.error('Get categories error:', error);
    return errorResponse('Failed to get categories', 500);
  }
}
