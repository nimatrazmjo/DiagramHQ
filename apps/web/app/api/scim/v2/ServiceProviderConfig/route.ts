import { NextResponse } from 'next/server';
import { getScimServiceProviderConfig } from '@diagramhq/domain';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}/api/scim/v2`;
  const config = getScimServiceProviderConfig(baseUrl);

  return NextResponse.json(config, {
    status: 200,
    headers: {
      'Content-Type': 'application/scim+json; charset=utf-8',
    },
  });
}
