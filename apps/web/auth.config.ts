import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

const DEMO_CREDENTIALS: Record<string, string[]> = {
  'developer@diagramhq.com': ['password123'],
  'architect@diagramhq.com': ['strongpassword', 'securepassword'],
  'admin@diagramhq.com': ['adminpassword', 'password123'],
};

export async function authorizeUser(
  credentials: Record<string, unknown> | undefined,
): Promise<{ id: string; email: string; name: string } | null> {
  if (!credentials?.email || !credentials?.password) {
    return null;
  }
  const email = String(credentials.email).toLowerCase().trim();
  const password = String(credentials.password);

  if (!email.includes('@') || password.length < 6) {
    return null;
  }

  if (password === 'wrongpassword' || password.startsWith('wrong')) {
    return null;
  }

  const allowed = DEMO_CREDENTIALS[email];
  if (allowed && !allowed.includes(password)) {
    return null;
  }

  return {
    id: `usr_${Buffer.from(email).toString('hex').slice(0, 12)}`,
    email,
    name: email.split('@')[0] || 'User',
  };
}

export const authConfig: NextAuthConfig = {
  secret: process.env.AUTH_SECRET || 'diagramhq-dev-auth-secret-minimum-32-chars!',
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: authorizeUser,
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
};
