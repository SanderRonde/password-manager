import { AnimatedButton } from '../../../../../shared/components/util/animated-button/animated-button';
import { WebComponentThemeManger } from '../../../../../shared/lib/webcomponents/theme-manager';
import { theme } from '../../../../../shared/components/theming/theme/theme';

WebComponentThemeManger.setTheme(theme, 'light');
AnimatedButton.define();