'use strict';
let localDynamo = require('local-dynamo');

// Run dynamoDB local on port 8080
localDynamo.launch('./database', 8080);
//https://github.com/Medium/dynamite/blob/master/test/utils/testUtils.js#L42

let credentials = {
    accessKeyId: 'Ignored',
    secretAccessKey: 'Ignored'
};

let dynasty = require('dynasty')(credentials, 'http://localhost:8080');

let createTable = dynasty.create(
    'calvinTable',
    {
        key_schema: {
            hash: ['id', 'string']
            //range: ['date', 'string']
        }
    }
).then(
    (resp) => {
        console.log(resp);
    },
    (err) => {
        console.log('Error: ' + err.message);
    }
);

let insertEntry = createTable.then(
    function (data) {
        //return a promise (will automatically not wrap in another promise) thanks to JS awesomeness
        //if entry exists - will overwrite
        return dynasty
            .table('calvinTable')
            .insert({
                id: '1',
                username: 'calvin'
            });
    }
    // don't have an error handler here because the 'then' above took care of it
    // really we should be using catch instead of supplying a success and error handler
);

let queryEntryThatWasJustInserted = insertEntry.then(
    function (data) { //data is unwrapped promise
        //return a promise (will automatically not wrap in another promise)
        console.log('Item was inserted successfully');
        return dynasty
            .table('calvinTable')
            .find({hash: "1"});
    },
    function (err) {
        //uh oh previous step had a problem
    }
);

let queryResults = queryEntryThatWasJustInserted.then(
    function (data) { //data is unwrapped promise
        console.log("The results are in: ");
        console.log(data);
    },
    function (err) {
        console.log("uh-oh query didn't come back :(");
        console.log(err);
    }
);

let updateAfterQuery = queryResults.then(
    function (data) {
        //return a promise (will automatically not wrap in another promise)
        return dynasty
            .table('calvinTable')
            .update('1', {
                username: 'calvin2',
                scala: 'isawesome'
            });
    }
);

let updateResults = updateAfterQuery.then(
    function (data) {   //data is unwrapped promise
        console.log('updated:');
        console.log(data);
    },
    function (err) {
        console.log("Uh oh, that didn't work");
        console.log(err);
    }
);

let queryAgain = updateResults.then(
    function (data) {
        //return a promise (will automatically not wrap in another promise)
        return dynasty
            .table('calvinTable')
            .find({hash: "1"});
    },
    function (err) {
        console.log("Uh oh, that didn't work - I was querying my updated result");
        console.log(err);
    }
);

let queryAgainResult = queryAgain.then(
    function (data) { //data is unwrapped promise
        console.log("The updated results are in: ");
        console.log(data);
    },
    function (err) {
        console.log("uh-oh query didn't come back :(");
        console.log(err);
    }
);

let tearDown = queryAgainResult.then(
    () => process.exit(0)
);

