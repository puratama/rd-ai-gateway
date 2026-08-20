import { NextResponse } from "next/server";

export const publicCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
};

export function apiError(
  message: string,
  status: number,
  code: string,
  type = status === 401 ? "authentication_error" : status === 429 ? "rate_limit_error" : "invalid_request_error",
  headers?: HeadersInit,
) {
  return NextResponse.json(
    { error: { message, type, param: null, code } },
    { status, headers: { ...publicCorsHeaders, ...headers } },
  );
}

export function withPublicCors(response: NextResponse) {
  for (const [key, value] of Object.entries(publicCorsHeaders)) response.headers.set(key, value);
  return response;
}

export function corsOptions() {
  return new NextResponse(null, { status: 204, headers: publicCorsHeaders });
}
