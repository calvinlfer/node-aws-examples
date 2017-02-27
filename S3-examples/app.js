'use strict';
let s3Wrapper = require('./libs/simpleS3Wrapper');
let AWS = require('aws-sdk');
let TEST_BUCKET_NAME = 'calvin-hello-bucket';

// Load AWS configuration from the path as opposed to a global location
// See https://aws.amazon.com/sdk-for-node-js/
// You may print the object returned to see more data
AWS.config.loadFromPath('./config.json');

let s3 = new AWS.S3();

function print(err, data) {
    if (err) {
        console.log(err);
    }
    else {
        console.log('Success: ');
        console.log(data);
    }
}

// It all starts with creating a bucket
s3Wrapper.createBucket(s3,TEST_BUCKET_NAME)
    .then((data)=>{
        // Successful callback (meaning the bucket is created)
        console.log(data);

        // Create a key with value as text
        return s3Wrapper.uploadKeyValuePairToBucket(s3, 'hello/hello.txt', 'there', TEST_BUCKET_NAME)
    .then((data)=>{
        // Since we were able to successfully store the key (hello), let's get it back and put it in a file
        return s3Wrapper.downloadFileToPathFromBucket(s3,'hello/hello.txt', 'hello.txt', TEST_BUCKET_NAME);
    })
    .then(()=>{
        // Create a key with value coming from a file
        return s3Wrapper.uploadFileIdentifiedWithKeyToBucket(s3,'hello/package.json', './package.json', TEST_BUCKET_NAME);
    })
    .then((uploadResponseData)=>{
        print(null, uploadResponseData);
        return true;
    })
    .then(()=>{
        let s3Options = { Bucket: TEST_BUCKET_NAME, Prefix: 'hello' };
        let destination = "./"

        return s3Wrapper.downloadS3Folder(s3, s3Options,destination);

    })
    .then(()=>{
        // Put a timer on emptying and deleting the bucket
        setTimeout(
            () => {
                s3Wrapper.listKeys(s3,{Bucket: TEST_BUCKET_NAME})
                .then((keys)=>{
                    print(null,keys);
                    return true;
                })
                .then(()=>{
                    return s3Wrapper.emptyAndDeleteBucket(s3,TEST_BUCKET_NAME);
                })
                .then((deleteBucketResult)=>{
                    print(null, deleteBucketResult);
                });
            },
            10000 //ms
        );
    })
    .catch((err) => {
        print(err,null);
    });
    }
);


