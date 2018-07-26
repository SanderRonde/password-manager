import { Dashboard } from '../../../../../../../../../shared/components/entrypoints/dashboard/dashboard';
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';
import blueGrey from '@material-ui/core/colors/blueGrey';
import indigo from '@material-ui/core/colors/indigo';
import { hydrate } from 'react-dom';
import * as React from 'react';
import { SheetsRegistry } from '../../../../../../../../../shared/node_modules/@types/jss';

class Main extends React.Component {
	// Remove the server-side injected CSS.
	componentDidMount() {
		const jssStyles = document.getElementById('jss-server-side');
		if (jssStyles && jssStyles.parentNode) {
			jssStyles.parentNode.removeChild(jssStyles);
		}
	}
  
	render() {
	  	return <Dashboard />
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

  SheetsRegistry