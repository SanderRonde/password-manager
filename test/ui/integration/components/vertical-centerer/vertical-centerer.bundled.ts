import { VerticalCenterer } from "../../../../../shared/components/util/vertical-centerer/vertical-centerer";
import { theme } from "../../../../../shared/components/theming/theme/theme";
import { WebComponentThemeManger } from "wclib";

WebComponentThemeManger.initTheme({
	theme, 
	defaultTheme: 'light'
});
VerticalCenterer.define();