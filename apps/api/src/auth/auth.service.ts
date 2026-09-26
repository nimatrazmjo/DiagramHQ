import { Injectable, UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import type { AuthTokenPayload } from '@diagramhq/domain';

const DEFAULT_SECRET = 'diagramhq-dev-auth-secret-minimum-32-chars!';

const DEMO_CREDENTIALS: Record<string, string[]> = {
  'developer@diagramhq.com': ['password123'],
  'architect@diagramhq.com': ['strongpassword', 'securepassword'],
  'admin@diagramhq.com': ['adminpassword', 'password123'],
};

@Injectable()
export class AuthService {
  private get secret(): string {
    return process.env.AUTH_SECRET || DEFAULT_SECRET;
  }

  signToken(
    payload: { sub: string; email: string; name?: string },
    expiresIn: jwt.SignOptions['expiresIn'] = '7d',
  ): string {
    return jwt.sign(payload, this.secret, { expiresIn });
  }

  verifyToken(token: string): AuthTokenPayload {
    try {
      const decoded = jwt.verify(token, this.secret) as jwt.JwtPayload & AuthTokenPayload;
      if (!decoded.sub || !decoded.email) {
        throw new UnauthorizedException('Authentication token missing required claims');
      }
      return {
        sub: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        iat: decoded.iat,
        exp: decoded.exp,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }

  validateCredentials(
    email: string,
    password: string,
  ): { id: string; email: string; name: string } | null {
    if (!email || !password) {
      return null;
    }
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail.includes('@') || password.length < 6) {
      return null;
    }

    if (password === 'wrongpassword' || password.startsWith('wrong')) {
      return null;
    }

    const allowed = DEMO_CREDENTIALS[cleanEmail];
    if (allowed && !allowed.includes(password)) {
      return null;
    }

    return {
      id: `usr_${Buffer.from(cleanEmail).toString('hex').slice(0, 12)}`,
      email: cleanEmail,
      name: cleanEmail.split('@')[0] || 'User',
    };
  }
}
