import { DeleteAccount as _DeleteAccount } from "./actions/delete";
import { CreateAccount as _CreateAccount } from "./actions/create";
import { Encrypted, Hashed } from "../../database/database";

export interface DecryptedAccount {
	email: string;
	pw: Hashed<string>;
}

export interface EncryptedAccount {
	email: string;
	pw: Encrypted<EncodedString<Hashed<string>>>;
}

export namespace Account {
	export const DeleteAccount = _DeleteAccount;
	export const CreateAccount = _CreateAccount;
}