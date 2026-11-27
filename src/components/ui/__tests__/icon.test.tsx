import { screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/render';

import { Icon, iconMap, type IconName } from '../icon';
import { iconPaths } from '../icon-paths';

describe('Icon', () => {
  test('every icon name has a drawn path', () => {
    for (const name of Object.keys(iconMap) as IconName[]) {
      expect(iconPaths[name].length).toBeGreaterThan(5);
    }
  });

  test('renders without being announced to screen readers', async () => {
    await renderWithProviders(<Icon name="check" color="#000" />);
    expect(screen.queryByRole('image')).toBeNull();
  });
});
