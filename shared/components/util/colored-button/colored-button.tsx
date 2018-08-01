import { withStyles, createStyles } from '@material-ui/core/styles';
import { fade } from '@material-ui/core/styles/colorManipulator';
import { WithStyles } from '@material-ui/core/styles/withStyles';
import { Theme } from '@material-ui/core/styles/createMuiTheme';
import { ButtonBaseProps } from '@material-ui/core/ButtonBase';
import { ButtonBase, StandardProps } from '@material-ui/core';
import { ButtonClassKey } from '@material-ui/core/Button';
import { classNames } from '../../../lib/react-util';
import * as React from 'react';

// const FAILED_COLOR = '#F44336';
// const SUCCESS_COLOR = '#4caf50';
const styles = (theme: Theme) => createStyles({
	/* Styles applied to the root element. */
	root: {
		...theme.typography.button,
		lineHeight: '1.4em',
		// Improve readability for multiline button.
		boxSizing: 'border-box',
		minWidth: 64,
		minHeight: 36,
		padding: '8px 16px',
		borderRadius: theme.shape.borderRadius,
		color: theme.palette.text.primary,
		transition: theme.transitions.create(['background-color', 'box-shadow'], {
		duration: theme.transitions.duration.short
		}),
		'&:hover': {
			textDecoration: 'none',
			backgroundColor: fade(theme.palette.text.primary, (theme.palette.action as any).hoverOpacity),
			// Reset on touch devices, it doesn't add specificity
			'@media (hover: none)': {
			backgroundColor: 'transparent'
			},
			'&$disabled': {
			backgroundColor: 'transparent'
			}
		},
		'&$disabled': {
			color: theme.palette.action.disabled
		}
	},

	/* Styles applied to the span element that wraps the children. */
	label: {
		display: 'inherit',
		alignItems: 'inherit',
		justifyContent: 'inherit'
	},

	/* Styles applied to the root element if `variant="text"`. */
	text: {},

	/* Styles applied to the root element if `variant="text"` and `color="primary"`. */
	textPrimary: {
		color: theme.palette.primary.main,
		'&:hover': {
			backgroundColor: fade(theme.palette.primary.main, (theme.palette.action as any).hoverOpacity),
				// Reset on touch devices, it doesn't add specificity
				'@media (hover: none)': {
				backgroundColor: 'transparent'
			}
		}
	},

	/* Styles applied to the root element if `variant="text"` and `color="secondary"`. */
	textSecondary: {
		color: theme.palette.secondary.main,
		'&:hover': {
			backgroundColor: fade(theme.palette.secondary.main, (theme.palette.action as any).hoverOpacity),
				// Reset on touch devices, it doesn't add specificity
				'@media (hover: none)': {
				backgroundColor: 'transparent'
			}
		}
	},

	/* Styles applied to the root element for backwards compatibility with legacy variant naming. */
	flat: {},

	/* Styles applied to the root element for backwards compatibility with legacy variant naming. */
	flatPrimary: {},

	/* Styles applied to the root element for backwards compatibility with legacy variant naming. */
	flatSecondary: {},

	/* Styles applied to the root element if `variant="outlined"`. */
	outlined: {
		border: "1px solid ".concat(theme.palette.type === 'light' ? 'rgba(0, 0, 0, 0.23)' : 'rgba(255, 255, 255, 0.23)')
	},

	/* Styles applied to the root element if `variant="[contained | fab]"`. */
	contained: {
		color: theme.palette.getContrastText(theme.palette.grey[300]),
		backgroundColor: theme.palette.grey[300],
		boxShadow: theme.shadows[2],
		'&$focusVisible': {
			boxShadow: theme.shadows[6]
		},
		'&:active': {
			boxShadow: theme.shadows[8]
		},
		'&$disabled': {
			color: theme.palette.action.disabled,
			boxShadow: theme.shadows[0],
			backgroundColor: theme.palette.action.disabledBackground
		},
		'&:hover': {
			backgroundColor: theme.palette.grey.A100,
			// Reset on touch devices, it doesn't add specificity
			'@media (hover: none)': {
				backgroundColor: theme.palette.grey[300]
			},
			'&$disabled': {
				backgroundColor: theme.palette.action.disabledBackground
			}
		}
	},

	/* Styles applied to the root element if `variant="[contained | fab|"` and `color="primary"`. */
	containedPrimary: {
		color: theme.palette.primary.contrastText,
		backgroundColor: theme.palette.primary.main,
		'&:hover': {
			backgroundColor: theme.palette.primary.dark,
			// Reset on touch devices, it doesn't add specificity
			'@media (hover: none)': {
			backgroundColor: theme.palette.primary.main
			}
		}
	},

	/* Styles applied to the root element if `variant="[contained | fab]"` and `color="secondary"`. */
	containedSecondary: {
		color: theme.palette.secondary.contrastText,
		backgroundColor: theme.palette.secondary.main,
		'&:hover': {
			backgroundColor: theme.palette.secondary.dark,
			// Reset on touch devices, it doesn't add specificity
			'@media (hover: none)': {
			backgroundColor: theme.palette.secondary.main
			}
		}
	},

	/* Styles applied to the root element for backwards compatibility with legacy variant naming. */
	raised: {},
	// legacy

	/* Styles applied to the root element for backwards compatibility with legacy variant naming. */
	raisedPrimary: {},
	// legacy

	/* Styles applied to the root element for backwards compatibility with legacy variant naming. */
	raisedSecondary: {},
	// legacy

	/* Styles applied to the root element if `variant="[fab | extendedFab]"`. */
	fab: {
		borderRadius: '50%',
		padding: 0,
		minWidth: 0,
		width: 56,
		height: 56,
		boxShadow: theme.shadows[6],
		'&:active': {
			boxShadow: theme.shadows[12]
		}
	},

	/* Styles applied to the root element if `variant="extendedFab"`. */
	extendedFab: {
		borderRadius: 48 / 2,
		padding: '0 16px',
		width: 'auto',
		minWidth: 48,
		height: 48
	},

	/* Styles applied to the ButtonBase root element if the button is keyboard focused. */
	focusVisible: {},

	/* Styles applied to the root element if `disabled={true}`. */
	disabled: {},

	/* Styles applied to the root element if `color="inherit"`. */
	colorInherit: {
		color: 'inherit'
	},

	/* Styles applied to the root element if `size="mini"` & `variant="[fab | extendedFab]"`. */
	mini: {
		width: 40,
		height: 40
	},

	/* Styles applied to the root element if `size="small"`. */
	sizeSmall: {
		padding: '7px 8px',
		minWidth: 64,
		minHeight: 32,
		fontSize: theme.typography.pxToRem(13)
	},

	/* Styles applied to the root element if `size="large"`. */
	sizeLarge: {
		padding: '8px 24px',
		minWidth: 112,
		minHeight: 40,
		fontSize: theme.typography.pxToRem(15)
	},

	/* Styles applied to the root element if `fullWidth={true}`. */
	fullWidth: {
		width: '100%'
	}
});

type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;

export interface ColoredButtonprops extends Omit<StandardProps<ButtonBaseProps, ButtonClassKey, 'component'>, 'classes'>, 
	WithStyles<typeof styles> {
		disabled?: boolean;
		variant?: 'fab'|'extendedFab'|'contained'|'raised'|'outlined'|'text'|'flat';
		mini?: boolean;
		color?: 'primary'|'secondary'|'inherit';
		size?: 'medium'|'large'|'small';
	}
const _ColoredButton = (() => {
	return class ColoredButton extends React.Component<ColoredButtonprops> {
		constructor(props: ColoredButtonprops) {
			super(props);
		}

		otherProps = (() => {
			const { 
				children: _children,
				classes: _classes,
				className: _className,
				color: _color,
				focusVisibleClassName: _focusVisibleClassName,
				mini: _mini,
				size: _size,
				variant: _variant,
				...other
			} = this.props;
			return other;
		})();

		classes = (() => {
			const variant = this.props.variant || 'text';
			const fab = variant === 'fab' || variant === 'extendedFab';
			const contained = variant === 'contained' || variant === 'raised';
			const text = variant === 'text' || variant === 'flat' || variant === 'outlined';
			const color = this.props.color || 'inherit';
			
			return classNames(this.props.classes.root, {
				[this.props.classes.fab]: fab,
				[this.props.classes.mini]: fab && this.props.mini,
				[this.props.classes.extendedFab]: variant === 'extendedFab',
				[this.props.classes.text]: text,
				[this.props.classes.textPrimary]: text && color === 'primary',
				[this.props.classes.textSecondary]: text && color === 'secondary',
				[this.props.classes.flat]: variant === 'text' || variant === 'flat',
				[this.props.classes.flatPrimary]: (variant === 'text' || variant === 'flat') && color === 'primary',
				[this.props.classes.flatSecondary]: (variant === 'text' || variant === 'flat') && color === 'secondary',
				[this.props.classes.contained]: contained || fab,
				[this.props.classes.containedPrimary]: (contained || fab) && color === 'primary',
				[this.props.classes.containedSecondary]: (contained || fab) && color === 'secondary',
				[this.props.classes.raised]: contained || fab,
				[this.props.classes.raisedPrimary]: (contained || fab) && color === 'primary',
				[this.props.classes.raisedSecondary]: (contained || fab) && color === 'secondary',
				[this.props.classes.outlined]: variant === 'outlined',
				[this.props.classes.disabled]: this.props.disabled,
				[this.props.classes.colorInherit]: color === 'inherit',
				[this.props.classes.sizeLarge]: this.props.size === 'large',
				[this.props.classes.sizeSmall]: this.props.size === 'small'
			}, this.props.className || '')
		})();

		render() {
			return (
				<ButtonBase disabled={this.props.disabled || false} focusRipple
					focusVisibleClassName={this.props.classes.focusVisible}
					className={this.classes} {...this.otherProps}
				>
					<span className={this.props.classes.label}>{this.props.children}</span>
				</ButtonBase>
			)
		}
	}
})();
export const ColoredButton = withStyles(styles)(_ColoredButton);