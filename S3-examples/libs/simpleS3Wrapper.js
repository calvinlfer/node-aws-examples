/**
 * A simple example that manipulates S3 buckets using the AWS SDK
 * @see http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html for more details
 */
'use strict';

var AWS = require('aws-sdk'),
    fs = require('fs'),
    _ = require('lodash');

// Load AWS configuration from the path as opposed to a global location
// See https://aws.amazon.com/sdk-for-node-js/
// You may print the object returned to see more data
AWS.config.loadFromPath('./config.json');

var s3 = new AWS.S3();

// Hardcoded value for grabbing the maximum amount of keys during an s3 listing
let MAX_KEYS = 1000;


/**
 * Wrapper on top of the AWS SDK to create a bucket in the region you specify in your config.json file
 * @param bucketName the name of the bucket
 * @param callback  the callback to execute (2 arg) when the function completes
 *
 * @see http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#createBucket-property
 * @see http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-examples.html#Amazon_S3__Create_a_New_Bucket_and_Object__createBucket__upload_
 */
function createBucket(bucketName, callback) {
    let params = {
        Bucket: bucketName
    };

    s3.createBucket(params, callback);
}

/**
 * Wrapper on top of the AWS SDK to delete a bucket in the region you specify in your config.json file
 * @param bucketName the name of the bucket to be deleted
 * @param callback  the callback to execute (2 arg) when the function completes
 *
 * @see http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#deleteBucket-property
 */
function deleteBucket(bucketName, callback) {
    let params = {
        Bucket: bucketName
    };

    s3.deleteBucket(params, callback);
}

function uploadKeyValuePairToBucket(key, val, bucket, callback) {
    s3.upload(
        {
            Bucket: bucket,
            Key: key,
            Body: val
        },
        callback
    );
}

function uploadFileIdentifiedWithKeyToBucket(key, filePath, bucket, callback) {
    // Verify if file really exists
    if (!fs.existsSync(filePath)) {
        callback(new Error('The file does not exist'), null);
    }

    // We actually treat the file as a readable stream and send it over to S3
    s3.upload(
        {
            Bucket: bucket,
            Key: key,
            Body: fs.createReadStream(filePath)
        },
        callback
    );
}

function readValueAsFileIdentifiedWithKeyFromBucket(key, filePath, bucket) {
    let params = {
        Bucket: bucket,
        Key: key
    };
    let response = s3.getObject(params);

    //Take the ReadableStream returned from the s3 object and pipe it to a file (writable stream)
    response
        .createReadStream()
        .pipe(fs.createWriteStream(filePath));
}

/**
 * A wrapper for listing keys that does accumulation of paged data so you don't have to worry about it
 * @param params object to configure the request with (similar format to how you make a real S3 request)
 * @param callback the callback in which the all the keys will be provided to you
 */
function listKeys(params, callback) {
    let keys = [];

    /**
     * Recursively list keys and use the keys, params and callback as a closure
     */
    function recursivelyListKeys(marker) {
        params.marker = marker;
        listKeyPage(
            params,
            //keyPage's callback, make further calls if needed here (based on the page marker)
            (error, nextMarker, keyset) => {
                if (error) {
                    return callback(error, keys);
                }

                keys = keys.concat(keyset);

                //nextMarker indicates more keys so we need to make another call to recursivelyListKeys
                if (nextMarker) {
                    listKeysRecusively(nextMarker);
                } else {
                    callback(null, keys);
                }
            }
        );
    }
    recursivelyListKeys();
}

/**
 * Does a paginated list keys request and passes marker information for the next page to the callback
 * @param options these are the parameters to configure the request
 * @param callback 3 argument function containing the keys, error message (if present) and next marker (if present)
 */
function listKeyPage(options, callback) {
    var params = {
        Bucket: options.Bucket,
        Delimiter: options.Delimiter,
        Marker: options.Marker,
        MaxKeys: MAX_KEYS,
        Prefix: options.Prefix
    };

    //Make the call to S3
    s3.listObjects(params, (error, response) => {
        if (error) {
            return callback(error);
        } else if (response.err) {
            return callback(new Error(response.err));
        }

        // Convert the results into an array of key strings, or
        // common prefixes if we're using a delimiter.
        let keys;
        if (options.delimiter) {
            // Note that if you set MAX_KEYS to 1 you can see some interesting
            // behavior in which the first response has no response.CommonPrefix
            // values, and so we have to skip over that and move on to the
            // next page.
            keys = _.map(response.CommonPrefixes, (item) => {
                return item.Prefix;
            });
        } else {
            keys = _.map(response.Contents, (item) => {
                return item.Key;
            });
        }

        // Check to see if there are yet more keys to be obtained, and if so
        // return the marker for use in the next request.
        let nextMarker;
        if (response.IsTruncated) {
            if (options.delimiter) {
                // If specifying a delimiter, the response.NextMarker field exists.
                nextMarker = response.NextMarker;
            } else {
                // For normal listing, there is no response.NextMarker
                // and we must use the last key instead.
                nextMarker = keys[keys.length - 1];
            }
        }
        callback(null, nextMarker, keys);
    });
}

function emptyAndDeleteBucket(bucket, callback) {
    listKeys(
        {
            Bucket: bucket
        },
        //key data is present in listKeys callback
        (err, data) => {
            if (err) {
                callback(err, null);
            } else {
                //delete all objects
                var params = {
                    Bucket: bucket,
                    Delete: {
                        // transform each element in the array to an object with {Key: thatElement}
                        // this is the format that AWS expects
                        Objects: _.map(data, (eachElement) => {return {Key: eachElement}})
                    }
                };

                s3.deleteObjects(
                    params,
                    //we delete the bucket if there are no errors in deleting all the objects in the bucket
                    (err, data) => {
                        if (err) {
                            callback(err, null);
                        } else {
                            deleteBucket(
                                bucket,
                                data => callback(null, data)
                            );
                        }
                    }
                );
            }
        }
    );
}


module.exports = {
    createBucket: createBucket,
    deleteBucket: deleteBucket,
    uploadKeyValuePairToBucket: uploadKeyValuePairToBucket,
    uploadFileIdentifiedWithKeyToBucket: uploadFileIdentifiedWithKeyToBucket,
    downloadFileToPathFromBucket: readValueAsFileIdentifiedWithKeyFromBucket,
    listKeys: listKeys,
    emptyAndDeleteBucket: emptyAndDeleteBucket
};