import { act, render, screen } from '@testing-library/react-native';
import { Keyboard, type KeyboardEventName, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BottomBar, Button } from '@/components/ui';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 24, left: 0, right: 0, bottom: 32 },
};

type Handler = () => void;

function renderBar() {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <BottomBar>
        <Button label="Continue" onPress={jest.fn()} />
        <Button label="Skip" variant="ghost" onPress={jest.fn()} />
      </BottomBar>
    </SafeAreaProvider>,
  );
}

describe('BottomBar', () => {
  const handlers = new Map<KeyboardEventName, Handler>();
  const remove = jest.fn();

  beforeEach(() => {
    handlers.clear();
    remove.mockClear();
    jest.spyOn(Keyboard, 'isVisible').mockReturnValue(false);
    jest.spyOn(Keyboard, 'addListener').mockImplementation((event, handler) => {
      handlers.set(event, handler as Handler);
      return { remove } as unknown as ReturnType<typeof Keyboard.addListener>;
    });
  });

  afterEach(() => jest.restoreAllMocks());

  test('holds its actions in reading order', async () => {
    await renderBar();
    const [first, second] = screen.getAllByRole('button');
    expect(first).toHaveAccessibleName('Continue');
    expect(second).toHaveAccessibleName('Skip');
  });

  test('stays above the navigation bar inset', async () => {
    await renderBar();
    expect(screen.getByTestId('bottom-bar')).toHaveStyle({ paddingBottom: 16 + 32 });
  });

  test('drops the inset while the keyboard is open, and restores it after', async () => {
    await renderBar();
    const bar = screen.getByTestId('bottom-bar');

    const ios = Platform.OS === 'ios';
    await act(async () => handlers.get(ios ? 'keyboardWillShow' : 'keyboardDidShow')?.());
    expect(bar).toHaveStyle({ paddingBottom: 16 });

    await act(async () => handlers.get(ios ? 'keyboardWillHide' : 'keyboardDidHide')?.());
    expect(bar).toHaveStyle({ paddingBottom: 48 });
  });

  test('stops listening to the keyboard when unmounted', async () => {
    const view = await renderBar();
    await view.unmount();
    expect(remove).toHaveBeenCalledTimes(2);
  });
});
