import getConfig from 'next/config';
import posthog from 'posthog-js';

const { publicRuntimeConfig } = getConfig();

export function initPosthog() {
  if (typeof window !== 'undefined') {
    // checks that we are client-side

    posthog.init(publicRuntimeConfig.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host:
        publicRuntimeConfig.NEXT_PUBLIC_POSTHOG_HOST ||
        'https://us.i.posthog.com',
      person_profiles: 'identified_only', // or 'always' to create profiles for anonymous users as well
      loaded: (posthog) => {
        if (publicRuntimeConfig.NODE_ENV === 'development') {
          posthog.debug();
        } // debug mode in development
      },
    });
  }
}
