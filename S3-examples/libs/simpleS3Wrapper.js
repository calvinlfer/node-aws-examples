/**
 * A simple example that manipulates S3 buckets using the AWS SDK
 * @see http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html for more details
 */
'use strict';

let fs = require('fs-extra'),
    _ = require('lodash'),
    path = require('path');

// Hardcoded value for grabbing the maximum amount of keys during an s3 listing
let MAX_KEYS = 1000;


/**
 * Wrapper on top of the AWS SDK to create a bucket in the region you specify in your config.json file
 * @param s3 an AWS.S3 object
 * @param bucketName the name of the bucket
 * @returns {Promise} a promise that resolves when the bucket has been created.
 *
 * @see http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#createBucket-property
 * @see http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-examples.html#Amazon_S3__Create_a_New_Bucket_and_Object__createBucket__upload_
 */
function createBucket(s3, bucketName) {
    return new Promise((resolve,reject) => {
        let params = {
            Bucket: bucketName
        };

        s3.createBucket(params, (err, data) => {
            if (err) 
                reject(err);
            else
                resolve(data);            
        });
    });
}

/**
 * Wrapper on top of the AWS SDK to delete a bucket in the region you specify in your config.json file
 * @param s3 an AWS.S3 object
 * @param bucketName the name of the bucket to be deleted
 * @returns {Promise} a promise that resolves when the bucket has been deleted.
 *
 * @see http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#deleteBucket-property
 */
function deleteBucket(s3, bucketName) {
    return new Promise((resolve,reject) => {
        let params = {
            Bucket: bucketName
        };

        s3.deleteBucket(params, (err, data) => {
            if (err) 
                reject(err);
            else
                resolve(data);            
        });
    });
}

function uploadKeyValuePairToBucket(s3, key, val, bucket) {
    return new Promise((resolve,reject) => {
        s3.upload(
            {
                Bucket: bucket,
                Key: key,
                Body: val
            }, 
        (err, data) => {
            if (err) 
                reject(err);
            else
                resolve(data);            
        });
    });
}

function uploadFileIdentifiedWithKeyToBucket(s3, key, filePath, bucket) {
    return new Promise((resolve,reject) => {
        // Verify if file really exists
        if (!fs.existsSync(filePath)) {
            reject(new Error('The file does not exist'), null);
        }

        // We actually treat the file as a readable stream and send it over to S3
        s3.upload(
            {
                Bucket: bucket,
                Key: key,
                Body: fs.createReadStream(filePath)
            }, (err, data) => {
                if (err) 
                    reject(err);
                else
                    resolve(data);            
            }
        );
    });
}

/** 
 * getObject from S3 and save to filePath
 * @param s3 an AWS.S3 object
 * @param {String} key the key of the object to retrieve from s3
 * @param {String} filePath the local file path to write the s3 object to
 * @param {String} bucket the S3 bucket name
 * @returns {Promise} a promise that resolves when the file has downloaded.
 */
function readValueAsFileIdentifiedWithKeyFromBucket(s3, key, filePath, bucket) {
    return new Promise((resolve, reject) => {
        let params = {
            Bucket: bucket,
            Key: key
        };

        // console.log(`key: ${val}`);
        let destDir = path.dirname(filePath);
        if ((filePath !== destDir) && (!/\/$/.test(filePath))) { // not a folder name
            // console.log(`ensuring existence of ${destDir}.`);
            fs.ensureDir(destDir, err => {
                if (err) { 
                    console.error(err); 
                    reject(err); 
                }

                // console.log("getting object: " + filePath);


                let response = s3.getObject(params);

                //Take the ReadableStream returned from the s3 object and pipe it to a file (writable stream)
                
                const readable = response
                    .createReadStream();
                const writable = fs.createWriteStream(filePath);
                // All the data from readable goes into 'file.txt'
                readable.pipe(writable);

                writable.on('finish',() => {
                    // console.log(`${key} finished.`);
                    resolve(key);
                });

                writable.on('error',(error)=>{
                    console.log(`${key} errored.`);
                    console.error(error);
                    reject(error);
                });

                readable.on('error',(error)=>{
                    console.log(`${key} errored.`);
                    console.error(error);
                    reject(error);
                })
            });
        } else { // it's a folder name.
            resolve(key);
        }
    });
}

/**
 * A wrapper for listing keys that does accumulation of paged data so you don't have to worry about it
 * @param s3 an AWS.S3 object
 * @param params object to configure the request with (similar format to how you make a real S3 request)
 * @returns {Promise} a promise that resolves when the keys have been retrieved.
 */
function listKeys(s3, params) {
    return new Promise((resolve, reject) => {
        let keys = [];

        /**
         * Recursively list keys and use the keys and params as a closure
         */
        function recursivelyListKeys(marker) {
            params.marker = marker;
            listKeyPage(
                s3,
                params)
            .then((resolvedObj)=>{
                let nextMarker = resolvedObj.nextMarker;
                let keyset = resolvedObj.keys;

                keys = keys.concat(keyset);

                //nextMarker indicates more keys so we need to make another call to recursivelyListKeys
                if (nextMarker) {
                    recursivelyListKeys(nextMarker);
                } else {
                    // console.log("resolving keys with:" ); console.log(keys);
                    resolve(keys);
                }
            })
        }
        recursivelyListKeys();
    });
}

/**
 * Does a paginated list keys request and passes marker information for the next page to the resolve
 * @param s3 an AWS.S3 object
 * @param options these are the parameters to configure the request
 * @returns {Promise} a promise that resolves when the key page has been listed.
 */
function listKeyPage(s3, options) {
    return new Promise((resolve, reject) => {
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
                return reject(error);
            } else if (response.err) {
                return reject(new Error(response.err));
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
            resolve({nextMarker:nextMarker, keys: keys});
        });
    });
}

function emptyAndDeleteBucket(s3, bucket) {
    return new Promise((resolve,reject)=>{
        listKeys(s3, { Bucket: bucket})
        .then((data)=>{
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
                        reject(err);
                    } else {
                        deleteBucket(
                            s3,
                            bucket,
                            data => resolve(data)
                        );
                    }
                }
            );
        })
        .catch((err)=>{
            reject(err);
        });
    });
}

/**
 * recursively download the S3 folder to the local path specified by destination. NOTE: only downloads a 
 * maximum of 1000 items
 * @param s3 an AWS.S3 object
 * @param {Object} s3Options Must have Bucket and Prefix e.g. { Bucket: 'themes-develop.ju.to', Prefix: 'united' }
 * @param {String} destination The local file path to which the matching folder(s) should be downloaded
 * @returns {Promise} a promise that resolves when all the downloading has been done.
 */
function downloadS3Folder(s3, s3Options, destination)  {
    return new Promise((resolve, reject) => {
        listKeys(s3, s3Options)
        .then((data)=>{
            let promisesPromises = [];
            // console.log(data);
            data.forEach((val, index, arr) => {
                let dest =  destination + val;
                let destDir = path.dirname(dest);
                if (dest !== destDir) { // it's not a directory
                    // console.log(`downloading ${val} to ${dest}, index = ${index}`);
                    promisesPromises.push(readValueAsFileIdentifiedWithKeyFromBucket(s3, val, dest, s3Options.Bucket));
                }                  
            });
            // console.log("forEach done; promisesPromises.length = " + promisesPromises.length);
            return Promise.all(promisesPromises);
        })
        .then(()=>{
            resolve(true);
        })
        .catch((err)=>{
            console.error(err);
            reject(err);
        });
    });
}


module.exports = {
    createBucket: createBucket,
    deleteBucket: deleteBucket,
    uploadKeyValuePairToBucket: uploadKeyValuePairToBucket,
    uploadFileIdentifiedWithKeyToBucket: uploadFileIdentifiedWithKeyToBucket,
    downloadFileToPathFromBucket: readValueAsFileIdentifiedWithKeyFromBucket,
    listKeys: listKeys,
    emptyAndDeleteBucket: emptyAndDeleteBucket,
    downloadS3Folder: downloadS3Folder
};