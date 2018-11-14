import { HorizontalCenterer } from "../../../../../shared/components/util/horizontal-centerer/horizontal-centerer";
import { WebComponentThemeManger } from "../../../../../shared/lib/webcomponents/theme-manager";
import { theme } from "../../../../../shared/components/theming/theme/theme";

WebComponentThemeManger.setTheme(theme, 'light');
HorizontalCenterer.define();