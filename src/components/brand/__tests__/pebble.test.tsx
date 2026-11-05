import { act, screen } from '@testing-library/react-native';
import { getAnimatedStyle } from 'react-native-reanimated';

import { Pebble } from '@/components/brand';
import { renderWithProviders } from '@/test/render';

let mockReduceMotion = false;
let mockScheme: 'light' | 'dark' = 'light';

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: () => mockReduceMotion,
}));

jest.mock('@/design/use-color-scheme', () => ({
  useColorScheme: () => mockScheme,
}));

const hidden = { includeHiddenElements: true };

type TransformStyle = { transform: Record<string, number | string>[] };
// The Jest implementation takes the element; the published (web) typing declares no argument.
const readAnimatedStyle = getAnimatedStyle as unknown as (element: unknown) => TransformStyle;

function transformOf(testID: string) {
  const { transform } = readAnimatedStyle(screen.getByTestId(testID, hidden));
  return Object.assign({}, ...transform) as Record<string, number | string>;
}

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

const bodyTransform = () => transformOf('pebble-body');

beforeEach(() => {
  jest.useFakeTimers();
  mockReduceMotion = false;
  mockScheme = 'light';
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Pebble', () => {
  test('is decorative by default', async () => {
    await renderWithProviders(<Pebble />);
    expect(screen.getByTestId('pebble', hidden)).not.toBeVisible();
    expect(screen.queryByRole('img')).not.toBeOnTheScreen();
  });

  test('can be a labelled image', async () => {
    await renderWithProviders(<Pebble accessibilityLabel="Pebble, your coach" />);
    expect(screen.getByRole('img', { name: 'Pebble, your coach' })).toBeOnTheScreen();
  });

  test.each([
    ['idle', 'pebble-eye'],
    ['grow', 'pebble-eye'],
    ['rest', 'pebble-eye-closed'],
    ['celebrate', 'pebble-eye-happy'],
  ] as const)('the %s mood shows its eyes', async (mood, eyes) => {
    await renderWithProviders(<Pebble mood={mood} />);
    expect(screen.getAllByTestId(eyes, hidden)).toHaveLength(2);
  });

  test('shows at most one peach detail: the spark replaces the cheeks', async () => {
    const { rerender } = await renderWithProviders(<Pebble mood="celebrate" />);
    expect(screen.getByTestId('pebble-cheeks', hidden)).toBeTruthy();
    expect(screen.queryByTestId('pebble-spark', hidden)).toBeNull();

    await rerender(<Pebble mood="celebrate" spark />);
    expect(screen.getByTestId('pebble-spark', hidden)).toBeTruthy();
    expect(screen.queryByTestId('pebble-cheeks', hidden)).toBeNull();
  });

  test('stays simple at avatar size: no ground shadow or cheeks', async () => {
    await renderWithProviders(<Pebble size={28} mood="celebrate" />);
    expect(screen.queryByTestId('pebble-ground', hidden)).toBeNull();
    expect(screen.queryByTestId('pebble-cheeks', hidden)).toBeNull();
  });

  test('changes posture with a spring when the mood changes', async () => {
    const { rerender } = await renderWithProviders(<Pebble mood="idle" />);
    await rerender(<Pebble mood="grow" />);

    await advance(60);
    const midway = bodyTransform();
    expect(midway.scaleY).toBeGreaterThan(1);
    expect(midway.scaleY).toBeLessThan(1.1);

    await advance(1000);
    expect(bodyTransform()).toMatchObject({ scaleX: 0.94, scaleY: 1.1, rotate: '0deg' });
  });

  test('leans forward to encourage and flattens to rest', async () => {
    const { rerender } = await renderWithProviders(<Pebble mood="encourage" />);
    expect(bodyTransform().rotate).toBe('7deg');

    await rerender(<Pebble mood="rest" />);
    await advance(1000);
    expect(bodyTransform()).toMatchObject({ scaleX: 1.1, scaleY: 0.84, rotate: '0deg' });
  });

  test('hops once to celebrate, then lands', async () => {
    const { rerender } = await renderWithProviders(<Pebble size={120} mood="idle" />);
    await rerender(<Pebble size={120} mood="celebrate" />);

    await advance(120);
    expect(bodyTransform().translateY).toBeLessThan(0);

    await advance(1500);
    expect(bodyTransform().translateY).toBe(0);
  });

  test('under reduced motion it takes the new posture at once and never hops', async () => {
    mockReduceMotion = true;
    const { rerender } = await renderWithProviders(<Pebble mood="idle" />);

    await rerender(<Pebble mood="celebrate" />);
    await advance(120);
    expect(bodyTransform().translateY).toBe(0);

    await rerender(<Pebble mood="grow" />);
    expect(bodyTransform()).toMatchObject({ scaleY: 1.1 });
  });

  test('blinks once after the given delay', async () => {
    await renderWithProviders(<Pebble blinkAfter={300} />);
    const eyeScale = () => transformOf('pebble-eyes').scaleY;

    await advance(250);
    expect(eyeScale()).toBe(1);
    await advance(130);
    expect(eyeScale()).toBeLessThan(1);
    await advance(500);
    expect(eyeScale()).toBe(1);
  });

  test('does not blink under reduced motion', async () => {
    mockReduceMotion = true;
    await renderWithProviders(<Pebble blinkAfter={0} />);
    await advance(80);
    expect(screen.getByTestId('pebble-eyes', hidden)).toHaveAnimatedStyle({
      transform: [{ translateX: 0 }, { translateY: 0 }, { scaleY: 1 }],
    });
  });

  test('uses its own dark palette: light purple on ink, not neon', async () => {
    const { rerender } = await renderWithProviders(<Pebble />);
    expect(screen.getByTestId('pebble-body', hidden)).toHaveStyle({ backgroundColor: '#7968E8' });

    mockScheme = 'dark';
    await rerender(<Pebble size={97} />);
    expect(screen.getByTestId('pebble-body', hidden)).toHaveStyle({ backgroundColor: '#A99DF7' });
  });
});
