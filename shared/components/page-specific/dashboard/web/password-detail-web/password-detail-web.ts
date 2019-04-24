import { PasswordDetail, PasswordDetailDependencies } from '../../password-detail/password-detail';
import { PasswordDetailHTML } from '../../password-detail/password-detail.html';
import { PasswordDetailCSS } from '../../password-detail/password-detail.css';
import { config } from 'wclib';

@config({
	is: 'password-detail',
	css: PasswordDetailCSS,
	html: PasswordDetailHTML,
	dependencies: PasswordDetailDependencies
})
export class PasswordDetailWeb extends PasswordDetail {
	u2fSupported() {
		return false;
	}
}