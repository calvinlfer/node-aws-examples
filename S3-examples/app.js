'use strict';
var s3Wrapper = require('./libs/simpleS3Wrapper');

function print(err, data) {
    if (err) {
        console.log(err);
    }
    else {
        console.log('Success: ');
        console.log(data);
    }
}

// it all starts with creating a bucket
s3Wrapper.createBucket(
    'calvin-hello-bucket',
    (err, data) => {
        // callback unsuccessful
        if (err) {
            console.log('Error: ' + err);
        } else {
            // successful callback (meaning the bucket is created)
            console.log(data);

            //create a key with value as text
            s3Wrapper.uploadKeyValuePairToBucket('hello', 'there', 'calvin-hello-bucket', (err, data) => {
                if (err) {
                    console.log(err);
                }
                else {
                    // since we were able to successfully store the key (hello), let's get it back and put it in a file
                    s3Wrapper.downloadFileToPathFromBucket('hello', 'hello.txt', 'calvin-hello-bucket');
                }
            });

            //create a key with value coming from a file
            s3Wrapper.uploadFileIdentifiedWithKeyToBucket('config', './package.json', 'calvin-hello-bucket', print);

            //Put a timer on emptying and deleting the bucket
            setTimeout(
                () => {
                    s3Wrapper.listKeys({Bucket: 'calvin-hello-bucket'}, print);
                    s3Wrapper.emptyAndDeleteBucket('calvin-hello-bucket', print);
                },
                10000 //ms
            );
        }
    }
);
