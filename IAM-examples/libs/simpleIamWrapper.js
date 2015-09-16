/**
 * A simple example that creates a new IAM user using your Access ID key and Secret Access Key
 * See http://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSGettingStartedGuide/AWSCredentials.html
 */
var AWS = require('aws-sdk');

// Load AWS configuration from the path as opposed to a global location
// See https://aws.amazon.com/sdk-for-node-js/
// You may print the object returned to see more data
AWS.config.loadFromPath('./config.json');

/**
 * Simple wrapper over Amazon's IAM API to create a new user
 * @param username
 * @param queryPath can be used to identify groups of users
 */
function createUserWithIAMAndPrintResult(username, queryPath) {
    // We will attempt to leverage IAM to programatically create a user from the JavaScript SDK
    // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/IAM.html
    var iAm = new AWS.IAM();
    iAm.createUser(
        {
            UserName: username,
            Path: queryPath   //can be used to sort and query users
        },
        (err, data) => {
            if (err) {
                console.log("An error occurred: " + err);
            } else {
                console.log("User has been successfully created");
                console.log(data);
            }
        }
    );
}

/**
 * Simple wrapper over Amazon's IAM API to delete a user
 * @param username
 */
function deleteUserWithIAMAndPrintResult(username) {
    // We will attempt to leverage IAM to programatically delete a user from the JavaScript SDK
    // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/IAM.html
    var iAm = new AWS.IAM();
    iAm.deleteUser(
        {
            UserName: username
        },
        (err, data) => {
            if (err) {
                console.log("An error occurred: " + err);
            } else {
                console.log("User has been successfully deleted");
                console.log(data);
            }
        }
    );
}

module.exports = {
    createUser: createUserWithIAMAndPrintResult,
    deleteUser: deleteUserWithIAMAndPrintResult
};