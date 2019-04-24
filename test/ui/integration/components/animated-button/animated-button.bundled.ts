import { AnimatedButton } from '../../../../../shared/components/util/animated-button/animated-button';
import { theme } from '../../../../../shared/components/theming/theme/theme.cjs';
import { WebComponentThemeManger } from 'wclib';

WebComponentThemeManger.initTheme({
	theme, 
	defaultTheme: 'light'
});
AnimatedButton.define();