import { getAppRedirect, ONBOARDING_REQUIRED, resolveAccess } from '../access';

const signedIn = { status: 'signedIn', isRecovery: false } as const;

describe('resolveAccess', () => {
  test('nothing protected is reachable while the session is being restored', () => {
    expect(
      resolveAccess({ auth: { status: 'loading', isRecovery: false }, onboardingCompleted: true }),
    ).toBe('loading');
  });

  test('signed-out users only get the auth screens', () => {
    expect(
      resolveAccess({
        auth: { status: 'signedOut', isRecovery: false },
        onboardingCompleted: true,
      }),
    ).toBe('signedOut');
  });

  test('onboarding is required in this build', () => {
    expect(ONBOARDING_REQUIRED).toBe(true);
  });

  test('signed-in users wait for their own profile before anything protected opens', () => {
    expect(resolveAccess({ auth: signedIn, onboardingCompleted: undefined })).toBe('loading');
  });

  test('an incomplete profile opens onboarding', () => {
    expect(resolveAccess({ auth: signedIn, onboardingCompleted: false })).toBe('onboarding');
  });

  test('a completed profile opens the app', () => {
    expect(resolveAccess({ auth: signedIn, onboardingCompleted: true })).toBe('app');
  });

  test('a profile that cannot be loaded shows an account error, not an endless loader', () => {
    expect(
      resolveAccess({
        auth: signedIn,
        onboardingCompleted: undefined,
        profileFailed: true,
      }),
    ).toBe('accountError');
  });

  test('a recovery session is held on the reset screen', () => {
    expect(
      resolveAccess({ auth: { status: 'signedIn', isRecovery: true }, onboardingCompleted: true }),
    ).toBe('recovery');
  });

  describe('when onboarding is required', () => {
    test('waits for the profile', () => {
      expect(
        resolveAccess({ auth: signedIn, onboardingCompleted: undefined, onboardingRequired: true }),
      ).toBe('loading');
    });

    test('sends new users to onboarding', () => {
      expect(
        resolveAccess({ auth: signedIn, onboardingCompleted: false, onboardingRequired: true }),
      ).toBe('onboarding');
    });

    test('lets onboarded users into the app', () => {
      expect(
        resolveAccess({ auth: signedIn, onboardingCompleted: true, onboardingRequired: true }),
      ).toBe('app');
    });

    test('a profile that cannot be loaded shows an account error, not an endless loader', () => {
      expect(
        resolveAccess({
          auth: signedIn,
          onboardingCompleted: undefined,
          profileFailed: true,
          onboardingRequired: true,
        }),
      ).toBe('accountError');
    });

    test('a failed refetch keeps using the profile already loaded', () => {
      expect(
        resolveAccess({
          auth: signedIn,
          onboardingCompleted: true,
          profileFailed: true,
          onboardingRequired: true,
        }),
      ).toBe('app');
    });

    test('recovery still takes precedence', () => {
      expect(
        resolveAccess({
          auth: { status: 'signedIn', isRecovery: true },
          onboardingCompleted: false,
          onboardingRequired: true,
        }),
      ).toBe('recovery');
    });

    test('the app can still be opened when onboarding is not required', () => {
      expect(
        resolveAccess({
          auth: signedIn,
          onboardingCompleted: false,
          onboardingRequired: false,
        }),
      ).toBe('app');
    });
  });
});

describe('getAppRedirect', () => {
  test.each([
    ['signedOut', '/welcome'],
    ['loading', '/welcome'],
    ['accountError', '/welcome'],
    ['onboarding', '/onboarding'],
    ['recovery', '/reset-password'],
  ] as const)('redirects %s users to %s', (access, href) => {
    expect(getAppRedirect(access)).toBe(href);
  });
});
