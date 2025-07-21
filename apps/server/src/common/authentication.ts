import { UnauthorizedException } from '@nestjs/common';
import { verify, decode } from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';

export async function getKey(jwt: string) {
  const decoded = decode(jwt, { complete: true });

  const client = new JwksClient({
    jwksUri: `${process.env.BACKEND_HOST}/auth/jwks`,
  });

  const key = await client.getSigningKey(decoded.header.kid);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return key!.getPublicKey();
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
): Promise<boolean> {
  try {
    // Better Auth handles all authentication (sessions, API keys, etc.)
    // This function is kept for backward compatibility
    const authHeader = request.headers['authorization'];
    return hasValidHeader(authHeader);
  } catch (err) {
    console.log(err);
    throw new UnauthorizedException({
      message: 'Unauthorised',
    });
  }
}
