import { WebComponentThemeManger } from "../../../../../shared/lib/webcomponents/theme-manager";
import { PaperButton } from "../../../../../shared/components/util/paper-button/paper-button";
import { theme } from "../../../../../shared/components/theming/theme/theme";

WebComponentThemeManger.setTheme(theme, 'light');
PaperButton.define();