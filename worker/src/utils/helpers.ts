// Utility functions for Workers

export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomUUID().replace(/-/g, '').substring(0, 12);
  return `${timestamp}${randomPart}`;
}

export function jsonResponse<T>(
  data: T,
  status: number = 200,
  headers?: Record<string, string>
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

export function errorResponse(
  message: string,
  status: number = 400,
  code?: string
): Response {
  return jsonResponse(
    {
      success: false,
      error: message,
      code,
    },
    status
  );
}

export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): Response {
  return jsonResponse(
    {
      success: true,
      data,
      message,
    },
    status
  );
}

export async function hashPassword(password: string, salt?: string): Promise<string> {
  // Generate a random salt if not provided
  const actualSalt = salt || crypto.randomUUID();
  const encoder = new TextEncoder();
  
  // Combine password and salt
  const combined = `${actualSalt}:${password}`;
  
  // Perform multiple rounds of hashing for key stretching
  let data = encoder.encode(combined);
  for (let i = 0; i < 10000; i++) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    data = new Uint8Array(hashBuffer);
  }
  
  const hashArray = Array.from(data);
  const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  
  // Return salt:hash format so we can verify later
  return `${actualSalt}:${hash}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  // Extract salt from stored hash
  const [salt] = storedHash.split(':');
  if (!salt) {
    return false;
  }
  
  // Hash the provided password with the same salt
  const newHash = await hashPassword(password, salt);
  
  // Constant-time comparison to prevent timing attacks
  if (newHash.length !== storedHash.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < newHash.length; i++) {
    result |= newHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  
  return result === 0;
}

export function parseQueryParams(url: URL): Record<string, string> {
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

export function getPaginationParams(
  params: Record<string, string>
): { page: number; limit: number; offset: number } {
  const parsedPage = Number.parseInt(params.page || '1', 10);
  const parsedLimit = Number.parseInt(params.limit || '20', 10);
  const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(100, Math.max(1, parsedLimit))
    : 20;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  return usernameRegex.test(username);
}

export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}
