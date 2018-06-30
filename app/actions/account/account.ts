import { DeleteAccount as _DeleteAccount } from "./actions/delete";
import { CreateAccount as _CreateAccount } from "./actions/create";

export namespace Account {
	export const CreateAccount = _CreateAccount;
	export const DeleteAccount = _DeleteAccount;
}