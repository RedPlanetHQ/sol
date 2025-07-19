import { Injectable } from '@nestjs/common';

import { auth } from './auth.config';

@Injectable()
export class AuthService {
  private authInstance = auth;

  /**
   * Get the auth instance for use in controllers
   */
  getAuth() {
    return this.authInstance;
  }

  /**
   * Convert HeadersInit to Headers object
   */
  private convertHeaders(headers: HeadersInit): Headers {
    if (headers instanceof Headers) {
      return headers;
    }
    return new Headers(headers);
  }

  /**
   * Sign out user
   */
  async signOut(headers: HeadersInit): Promise<void> {
    try {
      await this.authInstance.api.signOut({
        headers: this.convertHeaders(headers),
      });
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  /**
   * Get session info
   */
  async getSession(headers: HeadersInit) {
    try {
      return await this.authInstance.api.getSession({
        headers: this.convertHeaders(headers),
      });
    } catch (error) {
      console.error('Get session error:', error);
      return { session: null, user: null };
    }
  }
}
