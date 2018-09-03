import { PasswordPreview } from "../components/page-specific/dashboard/password-preview/password-preview";
import { PasswordDetail } from "../components/page-specific/dashboard/password-detail/password-detail";
import { HorizontalCenterer } from "../components/util/horizontal-centerer/horizontal-centerer";
import { VerticalCenterer } from "../components/util/vertical-centerer/vertical-centerer";
import { AnimatedButton } from "../components/util/animated-button/animated-button";
import { LoadingSpinner } from "../components/util/loading-spinner/loading-spinner";
import { MaterialInput } from "../components/util/material-input/material-input";
import { ThemeSelector } from "../components/util/theme-selector/theme-selector";
import { LoadableBlock } from "../components/util/loadable-block/loadable-block";
import { InfiniteList } from "../components/util/infinite-list/infinite-list";
import { SizingBlock } from "../components/util/sizing-block/sizing-block";
import { PaperButton } from "../components/util/paper-button/paper-button";
import { LoginWeb } from "../components/entrypoints/web/login/login-web";
import { PaperToast } from "../components/util/paper-toast/paper-toast";
import { IconButton } from "../components/util/icon-button/icon-button";
import { MDCard } from "../components/util/md-card/md-card";

declare global {
	type HTMLMdCardElement = MDCard;
	type HTMLMDCardElement = MDCard;
	type HTMLLoginElement = LoginWeb;
	type HTMLIconButtonElement = IconButton;
	type HTMLPaperToastElement = PaperToast;
	type HTMLPaperButtonElement = PaperButton;
	type HTMLSizingBlockElement = SizingBlock;
	type HTMLLoadableBlockElement = LoadableBlock;
	type HTMLMaterialInputElement = MaterialInput;
	type HTMLThemeSelectorElement = ThemeSelector;
	type HTMLAnimatedButtonElement = AnimatedButton;
	type HTMLPasswordDetailElement = PasswordDetail;
	type HTMLLoadingSpinnerElement = LoadingSpinner;
	type HTMLPasswordPreviewElement = PasswordPreview;
	type HTMLVerticalCentererElement = VerticalCenterer;
	type HTMLInfiniteListElement = InfiniteList<any, any, any>;
	type HTMLHorizontalCentererElement = HorizontalCenterer;
}