import { getAppRedirect, resolveAccess } from '../access';

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

  test('signed-in users reach the app', () => {
    expect(resolveAccess({ auth: signedIn, onboardingCompleted: undefined })).toBe('app');
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

    test('recovery still takes precedence', () => {
      expect(
        resolveAccess({
          auth: { status: 'signedIn', isRecovery: true },
          onboardingCompleted: false,
          onboardingRequired: true,
        }),
      ).toBe('recovery');
    });
  });
});

describe('getAppRedirect', () => {
  test.each([
    ['signedOut', '/welcome'],
    ['loading', '/welcome'],
    ['onboarding', '/onboarding'],
    ['recovery', '/reset-password'],
  ] as const)('redirects %s users to %s', (access, href) => {
    expect(getAppRedirect(access)).toBe(href);
  });
});
