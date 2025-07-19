import { randomBytes } from 'crypto';

import { UnauthorizedException } from '@nestjs/common';
import { verify, decode } from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';

import { UsersService } from 'modules/users/users.service';

export async function getKey(jwt: string) {
  const decoded = decode(jwt, { complete: true });

  const client = new JwksClient({
    jwksUri: `${process.env.BACKEND_HOST}/auth/jwks`,
  });

  const key = await client.getSigningKey(decoded.header.kid);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return key!.getPublicKey();
}

export async function hasValidPat(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  request: any,
  usersService: UsersService,
) {
  let authHeaderValue = request.headers['authorization'];
  authHeaderValue =
    authHeaderValue === undefined
      ? undefined
      : authHeaderValue.split('Bearer ')[1];

  if (authHeaderValue !== undefined) {
    const jwt = await usersService.getJwtFromPat(authHeaderValue);

    if (jwt) {
      const publicKey = await getKey(jwt);
      const data = verify(jwt, publicKey, {});

      // Note: With Better Auth, PAT authentication is handled in AuthGuard
      // This function is kept for backward compatibility
      request.userId = data.sub as string;
      return `Bearer ${jwt}`;
    }
  }

  return undefined;
}

export async function hasValidHeader(
  authHeaderValue: string,
  throwError: boolean = true,
) {
  authHeaderValue =
    authHeaderValue === undefined
      ? undefined
      : authHeaderValue.split('Bearer ')[1];

  if (authHeaderValue === undefined) {
    if (throwError) {
      throw new UnauthorizedException({
        message: 'Unauthorised',
      });
    }

    return false;
  }

  try {
    const publicKey = await getKey(authHeaderValue);
    verify(authHeaderValue, publicKey, {});
    return true;
  } catch (e) {
    if (throwError) {
      throw new UnauthorizedException({
        message: 'Unauthorised',
      });
    }
    return false;
  }
}

export async function isSessionValid(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  request: any,
  usersService: UsersService,
): Promise<boolean> {
  try {
    // Note: This function is kept for backward compatibility
    // In practice, Better Auth session validation is now handled by AuthGuard

    // Check for PAT validation
    let authHeader = request.headers['authorization'];
    if (authHeader && authHeader.includes('tg_pat_')) {
      authHeader = await hasValidPat(request, usersService);
      request.headers['personal'] = true;
      return hasValidHeader(authHeader);
    }

    return hasValidHeader(authHeader);
  } catch (err) {
    console.log(err);
    throw new UnauthorizedException({
      message: 'Unauthorised',
    });
  }
}

export function generatePersonalAccessToken(): string {
  const prefix = 'tg_pat_';
  const randomString = randomBytes(24)
    .toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '');

  return `${prefix}${randomString}`;
}
