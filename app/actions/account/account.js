"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const delete_1 = require("./actions/delete");
const create_1 = require("./actions/create");
var Account;
(function (Account) {
    Account.DeleteAccount = delete_1.DeleteAccount;
    Account.CreateAccount = create_1.CreateAccount;
})(Account = exports.Account || (exports.Account = {}));
