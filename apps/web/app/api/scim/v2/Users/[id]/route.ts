import { NextResponse } from 'next/server';
import {
  deleteScimUser,
  getScimUser,
  patchScimUser,
  SCIM_ERROR_SCHEMA,
  updateScimUser,
  validateScimBearerToken,
} from '@diagramhq/domain';
import { getGlobalScimState } from '@/lib/scim-server';

function checkAuth(request: Request, expectedToken: string) {
  const authHeader = request.headers.get('authorization') || undefined;
  return validateScimBearerToken(authHeader, expectedToken);
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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

  const result = getScimUser(state, params.id);
  if ('error' in result) {
    return NextResponse.json(result.error, {
      status: result.status,
      headers: { 'Content-Type': 'application/scim+json' },
    });
  }

  return NextResponse.json(result.user, {
    status: 200,
    headers: { 'Content-Type': 'application/scim+json; charset=utf-8' },
  });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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
        detail: 'Invalid JSON body',
      },
      { status: 400, headers: { 'Content-Type': 'application/scim+json' } }
    );
  }

  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}/api/scim/v2`;
  const result = updateScimUser(state, params.id, body, baseUrl);

  if ('error' in result) {
    return NextResponse.json(result.error, {
      status: result.status,
      headers: { 'Content-Type': 'application/scim+json' },
    });
  }

  return NextResponse.json(result.user, {
    status: 200,
    headers: { 'Content-Type': 'application/scim+json; charset=utf-8' },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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
        detail: 'Invalid JSON body',
      },
      { status: 400, headers: { 'Content-Type': 'application/scim+json' } }
    );
  }

  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}/api/scim/v2`;
  const result = patchScimUser(state, params.id, body, baseUrl);

  if ('error' in result) {
    return NextResponse.json(result.error, {
      status: result.status,
      headers: { 'Content-Type': 'application/scim+json' },
    });
  }

  return NextResponse.json(result.user, {
    status: 200,
    headers: { 'Content-Type': 'application/scim+json; charset=utf-8' },
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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

  const result = deleteScimUser(state, params.id);
  if ('error' in result) {
    return NextResponse.json(result.error, {
      status: result.status,
      headers: { 'Content-Type': 'application/scim+json' },
    });
  }

  return new NextResponse(null, { status: 204 });
}
