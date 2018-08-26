import { HorizontalCenterer } from "../components/util/horizontal-centerer/horizontal-centerer";
import { VerticalCenterer } from "../components/util/vertical-centerer/vertical-centerer";
import { AnimatedButton } from "../components/util/animated-button/animated-button";
import { LoadingSpinner } from "../components/util/loading-spinner/loading-spinner";
import { MaterialInput } from "../components/util/material-input/material-input";
import { ThemeSelector } from "../components/util/theme-selector/theme-selector";
import { LoadableBlock } from "../components/util/loadable-block/loadable-block";
import { InfiniteList } from "../components/util/infinite-list/infinite-list";
import { PaperButton } from "../components/util/paper-button/paper-button";
import { LoginWeb } from "../components/entrypoints/web/login/login-web";
import { PaperToast } from "../components/util/paper-toast/paper-toast";
import { IconButton } from "../components/util/icon-button/icon-button";

declare global {
	type HTMLLoginElement = LoginWeb;
	type HTMLIconButtonElement = IconButton;
	type HTMLPaperToastElement = PaperToast;
	type HTMLPaperButtonElement = PaperButton;
	type HTMLLoadableBlockElement = LoadableBlock;
	type HTMLMaterialInputElement = MaterialInput;
	type HTMLThemeSelectorElement = ThemeSelector;
	type HTMLAnimatedButtonElement = AnimatedButton;
	type HTMLLoadingSpinnerElement = LoadingSpinner;
	type HTMLVerticalCentererElement = VerticalCenterer;
	type HTMLInfiniteListElement = InfiniteList<any, any>;
	type HTMLHorizontalCentererElement = HorizontalCenterer;
}