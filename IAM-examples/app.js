'use strict';

var iAMWrapper = require('./libs/simpleIamWrapper');

let EXAMPLE_USER = "javascriptSDK-test";
let EXAMPLE_PATH = "/JS/Examples/";

console.log("Attempting to add a new user");
// Note these are asynchronous meaning they return immediately and do not block
iAMWrapper.createUser(EXAMPLE_USER, EXAMPLE_PATH);

// Wait for 1s before executing the deletion
setTimeout(
    () => {
        console.log('Attempting to delete the user');
        iAMWrapper.deleteUser(EXAMPLE_USER)
    },
    1000 //ms
)
;
