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

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
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
  const page = Math.max(1, parseInt(params.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(params.limit || '20', 10)));
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
