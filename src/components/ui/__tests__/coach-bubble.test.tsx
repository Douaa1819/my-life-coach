import { screen } from '@testing-library/react-native';

import { CoachBubble } from '@/components/ui';
import { renderWithProviders } from '@/test/render';

describe('CoachBubble', () => {
  test('is read as one coach message', async () => {
    await renderWithProviders(<CoachBubble message="No rush, Sam. Even five minutes counts." />);
    expect(
      screen.getByLabelText('Coach: No rush, Sam. Even five minutes counts.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('No rush, Sam. Even five minutes counts.')).toBeOnTheScreen();
  });

  test('shows a decorative Pebble avatar, which can be left out for grouped messages', async () => {
    const { rerender } = await renderWithProviders(<CoachBubble message="Hi" />);
    const avatar = screen.getByTestId('pebble', { includeHiddenElements: true });
    expect(avatar).not.toBeVisible();
    expect(screen.queryByRole('img')).not.toBeOnTheScreen();

    await rerender(<CoachBubble message="Hi" showAvatar={false} />);
    expect(screen.queryByTestId('pebble', { includeHiddenElements: true })).not.toBeOnTheScreen();
  });

  test('a live preview announces its new text politely', async () => {
    const { rerender } = await renderWithProviders(
      <CoachBubble live message="No rush, Sam. Even five minutes counts today." />,
    );
    const bubble = screen.getByLabelText('Coach: No rush, Sam. Even five minutes counts today.');
    expect(bubble.props['aria-live']).toBe('polite');

    await rerender(<CoachBubble live message="Today: 15 minutes on your run plan. Let's do it." />);
    expect(
      screen.getByLabelText("Coach: Today: 15 minutes on your run plan. Let's do it."),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/No rush/)).not.toBeOnTheScreen();
  });

  test('a regular message is not a live region', async () => {
    await renderWithProviders(<CoachBubble message="Hello" />);
    expect(screen.getByLabelText('Coach: Hello').props['aria-live']).toBeUndefined();
  });
});
