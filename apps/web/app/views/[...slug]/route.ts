import type { NextRequest } from 'next/server';
import { proxyApiRequest } from '@/lib/model/model-proxy';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string[] } },
) {
  const path = `/views/${params.slug.join('/')}${req.nextUrl.search}`;
  return proxyApiRequest(req, path);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string[] } },
) {
  const path = `/views/${params.slug.join('/')}${req.nextUrl.search}`;
  return proxyApiRequest(req, path);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { slug: string[] } },
) {
  const path = `/views/${params.slug.join('/')}${req.nextUrl.search}`;
  return proxyApiRequest(req, path);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { slug: string[] } },
) {
  const path = `/views/${params.slug.join('/')}${req.nextUrl.search}`;
  return proxyApiRequest(req, path);
}
