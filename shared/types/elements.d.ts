import { HorizontalCenterer } from "../components/util/horizontal-centerer/horizontal-centerer";
import { VerticalCenterer } from "../components/util/vertical-centerer/vertical-centerer";
import { AnimatedButton } from "../components/util/animated-button/animated-button";
import { MaterialInput } from "../components/util/material-input/material-input";
import { IconButton } from "../components/util/icon-button/icon-button";
import { Login } from "../components/entrypoints/web/login/login";

declare global {
	type HTMLLoginElement = Login;
	type HTMLIconButtonElement = IconButton;
	type HTMLMaterialInputElement = MaterialInput;
	type HTMLAnimatedButtonElement = AnimatedButton;
	type HTMLVerticalCentererElement = VerticalCenterer;
	type HTMLHorizontalCentererElement = HorizontalCenterer;
}