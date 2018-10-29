import { PasswordPreview } from "../components/page-specific/dashboard/password-preview/password-preview";
import { FloatingActionButton } from "../components/util/floating-action-button/floating-action-button";
import { PasswordDetail } from "../components/page-specific/dashboard/password-detail/password-detail";
import { PasswordForm } from "../components/page-specific/dashboard/password-form/password-form";
import { HorizontalCenterer } from "../components/util/horizontal-centerer/horizontal-centerer";
import { MaterialCheckbox } from "../components/util/material-checkbox/material-checkbox";
import { VerticalCenterer } from "../components/util/vertical-centerer/vertical-centerer";
import { DashboardWeb } from "../components/entrypoints/web/dashboard/dashboard-web";
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
import { MoreInfo } from "../components/util/more-info/more-info";
import { MDCard } from "../components/util/md-card/md-card";

declare global {
	type HTMLMdCardElement = MDCard;
	type HTMLMDCardElement = MDCard;
	type HTMLLoginElement = LoginWeb;
	type HTMLMoreInfoElement = MoreInfo;
	type HTMLIconButtonElement = IconButton;
	type HTMLPaperToastElement = PaperToast;
	type HTMLDashboardElement = DashboardWeb;
	type HTMLPaperButtonElement = PaperButton;
	type HTMLSizingBlockElement = SizingBlock;
	type HTMLPasswordFormElement = PasswordForm;
	type HTMLLoadableBlockElement = LoadableBlock;
	type HTMLMaterialInputElement = MaterialInput;
	type HTMLThemeSelectorElement = ThemeSelector;
	type HTMLAnimatedButtonElement = AnimatedButton;
	type HTMLPasswordDetailElement = PasswordDetail;
	type HTMLLoadingSpinnerElement = LoadingSpinner;
	type HTMLPasswordPreviewElement = PasswordPreview;
	type HTMLVerticalCentererElement = VerticalCenterer;
	type HTMLMaterialCheckboxElement = MaterialCheckbox;
	type HTMLInfiniteListElement = InfiniteList<any, any, any>;
	type HTMLHorizontalCentererElement = HorizontalCenterer;
	type HTMLFloatingActionButtonElement = FloatingActionButton;

	type HTMLPathElement = any;

	type WebComponentElementsByTag = {
		'md-card': MDCard;
		'login-web': LoginWeb;
		'more-info': MoreInfo;
		'paper-toast': PaperToast;
		'icon-button': IconButton;
		'sizing-block': SizingBlock;
		'paper-button': PaperButton;
		'password-form': PasswordForm;
		'dashboard-web': DashboardWeb;
		'loadable-block': LoadableBlock;
		'material-input': MaterialInput;
		'theme-selector': ThemeSelector;
		'animated-button': AnimatedButton;
		'password-detail': PasswordDetail;
		'loading-spinner': LoadingSpinner;
		'password-preview': PasswordPreview;
		'vertical-centerer': VerticalCenterer;
		'material-checkbox': MaterialCheckbox;
		'horizontal-centerer': HorizontalCenterer;
		'infinte-list': InfiniteList<any, any, any>;
		'floating-action-button': FloatingActionButton;
	}

	type WebComponentElementsWithName = {
		[T in keyof WebComponentElementsByTag]: WebComponentElementsByTag[T] & {
			name: T;
		}
	}

	type WebComponentElements = WebComponentElementsWithName[keyof WebComponentElementsWithName];
}