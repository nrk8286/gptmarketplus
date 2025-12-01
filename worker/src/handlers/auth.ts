// Auth API handlers

import type { RequestContext } from '../types/env.js';
import {
  hashPassword,
  verifyPassword,
  validateEmail,
  validateUsername,
  sanitizeString,
  errorResponse,
  successResponse,
} from '../utils/helpers.js';
import { createUser, getUserByEmail, getUserById } from '../services/database.js';
import { generateJwt } from '../middleware/auth.js';

export async function handleRegister(
  request: Request,
  ctx: RequestContext
): Promise<Response> {
  try {
    const body = await request.json() as {
      email?: string;
      username?: string;
      password?: string;
      displayName?: string;
    };

    const { email, username, password, displayName } = body;

    // Validate required fields
    if (!email || !username || !password) {
      return errorResponse('Email, username, and password are required', 400);
    }

    // Validate email format
    if (!validateEmail(email)) {
      return errorResponse('Invalid email format', 400);
    }

    // Validate username format
    if (!validateUsername(username)) {
      return errorResponse('Username must be 3-30 characters, alphanumeric and underscores only', 400);
    }

    // Validate password strength
    if (password.length < 8) {
      return errorResponse('Password must be at least 8 characters', 400);
    }

    // Check if email already exists
    const existingUser = await getUserByEmail(ctx.env.DB, email);
    if (existingUser) {
      return errorResponse('Email already registered', 409);
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const userId = await createUser(ctx.env.DB, {
      email: sanitizeString(email),
      username: sanitizeString(username),
      passwordHash,
      displayName: displayName ? sanitizeString(displayName) : undefined,
    });

    // Generate JWT token
    const token = await generateJwt(
      {
        sub: userId,
        email,
        username,
        isAdmin: false,
        isCreator: false,
      },
      ctx.env.JWT_SECRET
    );

    // Store session in KV
    const sessionKey = `session:${userId}:${token.substring(0, 16)}`;
    await ctx.env.SESSIONS.put(sessionKey, JSON.stringify({ userId, createdAt: new Date().toISOString() }), {
      expirationTtl: 86400,
    });

    return successResponse(
      {
        token,
        user: {
          id: userId,
          email,
          username,
          displayName: displayName || null,
        },
      },
      'Registration successful',
      201
    );
  } catch (error) {
    console.error('Registration error:', error);
    return errorResponse('Registration failed', 500);
  }
}

export async function handleLogin(
  request: Request,
  ctx: RequestContext
): Promise<Response> {
  try {
    const body = await request.json() as { email?: string; password?: string };
    const { email, password } = body;

    if (!email || !password) {
      return errorResponse('Email and password are required', 400);
    }

    // Get user by email
    const user = await getUserByEmail(ctx.env.DB, email);
    if (!user) {
      return errorResponse('Invalid credentials', 401);
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash as string);
    if (!isValidPassword) {
      return errorResponse('Invalid credentials', 401);
    }

    // Generate JWT token
    const token = await generateJwt(
      {
        sub: user.id as string,
        email: user.email as string,
        username: user.username as string,
        isAdmin: Boolean(user.is_admin),
        isCreator: Boolean(user.is_creator),
      },
      ctx.env.JWT_SECRET
    );

    // Store session in KV
    const sessionKey = `session:${user.id}:${token.substring(0, 16)}`;
    await ctx.env.SESSIONS.put(
      sessionKey,
      JSON.stringify({ userId: user.id, createdAt: new Date().toISOString() }),
      { expirationTtl: 86400 }
    );

    return successResponse({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
        isAdmin: Boolean(user.is_admin),
        isCreator: Boolean(user.is_creator),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('Login failed', 500);
  }
}

export async function handleGetProfile(
  request: Request,
  ctx: RequestContext
): Promise<Response> {
  if (!ctx.user) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const user = await getUserById(ctx.env.DB, ctx.user.id);
    if (!user) {
      return errorResponse('User not found', 404);
    }

    return successResponse({
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      isAdmin: Boolean(user.is_admin),
      isCreator: Boolean(user.is_creator),
      walletBalance: user.wallet_balance,
      emailVerified: Boolean(user.email_verified),
      createdAt: user.created_at,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return errorResponse('Failed to get profile', 500);
  }
}

export async function handleLogout(
  request: Request,
  ctx: RequestContext
): Promise<Response> {
  if (!ctx.user) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    // Get token from header
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const sessionKey = `session:${ctx.user.id}:${token.substring(0, 16)}`;
      await ctx.env.SESSIONS.delete(sessionKey);
    }

    return successResponse(null, 'Logged out successfully');
  } catch (error) {
    console.error('Logout error:', error);
    return errorResponse('Logout failed', 500);
  }
}
