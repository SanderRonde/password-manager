import { HorizontalCenterer } from "../../../../../shared/components/util/horizontal-centerer/horizontal-centerer";
import { theme } from "../../../../../shared/components/theming/theme/theme";
import { WebComponentThemeManger } from "wclib";

WebComponentThemeManger.initTheme({
	theme, 
	defaultTheme: 'light'
});
HorizontalCenterer.define();