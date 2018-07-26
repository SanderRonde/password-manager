import { Login } from '../../../../../../../../../shared/components/entrypoints/login/login';
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';
import blueGrey from '@material-ui/core/colors/blueGrey';
import indigo from '@material-ui/core/colors/indigo';
import { hydrate } from 'react-dom';
import * as React from 'react';

class Main extends React.Component {
	// Remove the server-side injected CSS.
	componentDidMount() {
		const jssStyles = document.getElementById('jss-server-side');
		if (jssStyles && jssStyles.parentNode) {
			jssStyles.parentNode.removeChild(jssStyles);
		}
	}
  
	render() {
	  	return <Login />
	}
}
  
// Create a theme instance.
const theme = createMuiTheme({
	palette: {
		primary: blueGrey,
		secondary: indigo,
		type: 'light',
	},
});
  
hydrate(
	<MuiThemeProvider theme={theme}>
		<Main />
	</MuiThemeProvider>, document.getElementById('app'),
);