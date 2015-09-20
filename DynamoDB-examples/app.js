'use strict';

var AWS = require('aws-sdk');
var _ = require('lodash');

// Load AWS credentials from path
AWS.config.loadFromPath('./config.json');

var dynamoDb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

setTimeout(
  () =>
    dynamoDb.listTables(
      {},
      (err, data) => {
        if (err) {
          console.error(err);
        } else {
          console.log("DynamoDB Tables:");
          console.log(data);
        }
      }
    )
  ,
  1000    //ms
);

// Creates a new item, or replaces an old item with a new item. If an item that has the same primary key as the new
// item already exists in the specified table, the new item completely replaces the existing item. You can perform a
// conditional put operation (add a new item if one with the specified primary key doesn't exist), or replace an
// existing item if it has certain attribute values.
dynamoDb.putItem(
  {
    TableName: 'CalvinDynamoTest',
    Item: {
      Id: {
        S: "2"
      },
      FirstName: {
        S: "Jack"
      },
      //Has no middle name
      employeeNumber: {
        N: "23456"
      }
    },
    // if item is replacing an existing one in the database, you can return the old item back
    ReturnValues: 'ALL_OLD',

    // for doing conditional puts
    Expected: {
      SomeNewParam: {
        //Value: {
        //    S: "SomeAttributeValue"
        //},
        Exists: false
      }
    }
  },
  (err, data) => {
    if (err) {
      // an error occurred
      console.log(err, err.stack);
    }
    else {
      // successful response
      console.log('Successfully inserted');
      console.log(data);
    }
  }
);


// Simple Query to table 'CalvinDynamoTest' for Id=1 (the primary index hash key)
// http://stackoverflow.com/questions/31219436/issues-with-dynamodb-query-with-keyconditionexpression
dynamoDb.query(
  {
    TableName: 'CalvinDynamoTest',
    Select: 'ALL_ATTRIBUTES',
    ConsistentRead: false,           //Don't care if its not the most updated value
    KeyConditionExpression: 'Id = :id',
    ExpressionAttributeValues: {
      ":id": {
        S: "1"
      }
    }
  },
  (err, data) => {
    if (err) {
      console.error(err);
    } else {
      // Returns an array of objects
      console.log("Query result:");
      // Iterate over each object in array and print it out
      _.map(
        data,
          eachElement => console.log(eachElement)
      );
    }
  }
);

// Simple Scan to table 'CalvinDynamoTest' to check if FirstName contains 'vin'
// Scan supports any attributes of elements in table
// http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#scan-property
dynamoDb.scan(
  {
    TableName: 'CalvinDynamoTest',
    Select: 'ALL_ATTRIBUTES',
    ConsistentRead: false,           //Don't care if its not the most updated value
    ScanFilter: {
      FirstName: {
        ComparisonOperator: 'CONTAINS',
        AttributeValueList: [
          {
            S: 'vin'
          }
        ]
      }
    }
  },
  (err, data) => {
    if (err) {
      console.error(err);
    } else {
      // Returns an array of objects
      console.log("Scan result:");
      // Iterate over each object in array and print it out
      _.map(
        data,
          eachElement =>
          console.log(eachElement)
      );
    }
  }
);
