import { router } from 'expo-router';

import { leaveScreen } from '../leave-screen';

jest.mock('expo-router', () => ({
  router: { canGoBack: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

const mocked = jest.mocked(router);

describe('leaveScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  test('goes back when there is history', () => {
    mocked.canGoBack.mockReturnValue(true);
    leaveScreen('/goals');
    expect(mocked.back).toHaveBeenCalledTimes(1);
    expect(mocked.replace).not.toHaveBeenCalled();
  });

  test('replaces with the fallback after a refresh or deep link', () => {
    mocked.canGoBack.mockReturnValue(false);
    leaveScreen('/goals');
    expect(mocked.back).not.toHaveBeenCalled();
    expect(mocked.replace).toHaveBeenCalledWith('/goals');
  });
});
