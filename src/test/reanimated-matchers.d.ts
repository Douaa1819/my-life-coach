// Registered at runtime by `setUpTests()` in jest-setup.ts.
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveAnimatedStyle(
        style: Record<string, unknown> | Record<string, unknown>[],
        config?: { shouldMatchAllProps?: boolean },
      ): R;
    }
  }
}

export {};
