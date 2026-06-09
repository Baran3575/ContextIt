"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.unusedMain = unusedMain;
const utils_1 = require("./utils");
function registerUser(email) {
    const hp = (0, utils_1.hashPassword)("secret");
    return { id: "1", email };
}
function unusedMain() {
    console.log("hello");
}
