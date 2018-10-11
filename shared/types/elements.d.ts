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

	type WebComponentElements = MDCard & {
		name: 'md-card'
	}|LoginWeb & {
		name: 'login-web'
	}|DashboardWeb & {
		name: 'dashboard-web'
	}|IconButton & {
		name: 'icon-button'
	}|PaperToast & {
		name: 'paper-toast'
	}|PaperButton & {
		name: 'paper-button'
	}|SizingBlock & {
		name: 'sizing-block'
	}|LoadableBlock & {
		name: 'loadable-block'
	}|MaterialInput & {
		name: 'material-input'
	}|ThemeSelector & {
		name: 'theme-selector'
	}|AnimatedButton & {
		name: 'animated-button'
	}|PasswordDetail & {
		name: 'password-detail'
	}|LoadingSpinner & {
		name: 'loading-spinner'
	}|PasswordPreview & {
		name: 'password-preview'
	}|VerticalCenterer & {
		name: 'vertical-centerer'
	}|InfiniteList<any,any,any> & {
		name: 'infinite-list'
	}|HorizontalCenterer & {
		name: 'horizontal-centerer'
	}|MaterialCheckbox & {
		name: 'material-checkbox'
	}|MoreInfo & {
		name: 'more-info'
	}|PasswordForm & {
		name: 'password-form'
	}|FloatingActionButton & {
		name: 'floating-action-button'
	}
}