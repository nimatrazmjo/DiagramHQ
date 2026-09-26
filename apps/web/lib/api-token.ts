import { SignJWT } from 'jose';

const DEFAULT_SECRET = 'diagramhq-dev-auth-secret-minimum-32-chars!';

export async function signApiToken(user: {
  id: string;
  email: string;
  name?: string | null;
}): Promise<string> {
  const secretKey = new TextEncoder().encode(process.env.AUTH_SECRET || DEFAULT_SECRET);

  return new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name ?? undefined,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);
}
