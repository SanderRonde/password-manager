import { VerticalCenterer } from "../../../../../shared/components/util/vertical-centerer/vertical-centerer";
import { WebComponentThemeManger } from "../../../../../shared/lib/webcomponents/theme-manager";
import { theme } from "../../../../../shared/components/theming/theme/theme";

WebComponentThemeManger.setTheme(theme, 'light');
VerticalCenterer.define();