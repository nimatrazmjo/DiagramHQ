import { NextResponse } from 'next/server';
import {
  createScimUser,
  listScimUsers,
  SCIM_ERROR_SCHEMA,
  validateScimBearerToken,
} from '@diagramhq/domain';
import { getGlobalScimState } from '@/lib/scim-server';

function checkAuth(request: Request, expectedToken: string) {
  const authHeader = request.headers.get('authorization') || undefined;
  return validateScimBearerToken(authHeader, expectedToken);
}

export async function GET(request: Request) {
  const state = getGlobalScimState();
  if (!checkAuth(request, state.config.bearerToken)) {
    return NextResponse.json(
      {
        schemas: [SCIM_ERROR_SCHEMA],
        status: '401',
        detail: 'Unauthorized: Invalid or missing SCIM Bearer token',
      },
      { status: 401, headers: { 'Content-Type': 'application/scim+json' } }
    );
  }

  const url = new URL(request.url);
  const filter = url.searchParams.get('filter') || undefined;
  const startIndex = url.searchParams.has('startIndex')
    ? parseInt(url.searchParams.get('startIndex')!, 10)
    : undefined;
  const count = url.searchParams.has('count')
    ? parseInt(url.searchParams.get('count')!, 10)
    : undefined;

  const baseUrl = `${url.protocol}//${url.host}/api/scim/v2`;
  const result = listScimUsers(state, { filter, startIndex, count }, baseUrl);

  return NextResponse.json(result, {
    status: 200,
    headers: { 'Content-Type': 'application/scim+json; charset=utf-8' },
  });
}

export async function POST(request: Request) {
  const state = getGlobalScimState();
  if (!checkAuth(request, state.config.bearerToken)) {
    return NextResponse.json(
      {
        schemas: [SCIM_ERROR_SCHEMA],
        status: '401',
        detail: 'Unauthorized: Invalid or missing SCIM Bearer token',
      },
      { status: 401, headers: { 'Content-Type': 'application/scim+json' } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        schemas: [SCIM_ERROR_SCHEMA],
        status: '400',
        detail: 'Invalid JSON payload',
      },
      { status: 400, headers: { 'Content-Type': 'application/scim+json' } }
    );
  }

  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}/api/scim/v2`;
  const result = createScimUser(state, body, baseUrl);

  if ('error' in result) {
    return NextResponse.json(result.error, {
      status: result.status,
      headers: { 'Content-Type': 'application/scim+json' },
    });
  }

  return NextResponse.json(result.user, {
    status: 201,
    headers: {
      'Content-Type': 'application/scim+json; charset=utf-8',
      Location: result.user.meta.location || '',
    },
  });
}
