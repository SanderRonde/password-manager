import { PaperButton } from "../../../../../shared/components/util/paper-button/paper-button";
import { theme } from "../../../../../shared/components/theming/theme/theme";
import { WebComponentThemeManger } from "wclib";

WebComponentThemeManger.initTheme({
	theme, 
	defaultTheme: 'light'
});
PaperButton.define();