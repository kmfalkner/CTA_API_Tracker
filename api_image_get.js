//
// app.get('/image/:assetid', async (req, res) => {...});
//
// downloads an asset from S3 bucket and sends it back to the
// client as a base64-encoded string.
//
const photoapp_db = require('./photoapp_db.js')
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { photoapp_s3, s3_bucket_name, s3_region_name } = require('./photoapp_s3.js');
const { inflate } = require('node:zlib');

exports.get_image = async (req, res) => {

  console.log("**Call to get /image/:imageid...");

  try {

    //
    // TODO
    //
    // MySQL in JS:
    //   https://expressjs.com/en/guide/database-integration.html#mysql
    //   https://github.com/mysqljs/mysql
    // AWS:
    //   https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html
    //   https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/classes/getobjectcommand.html
    //   https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/
    //
    
    assetid = req.params.imageid

    let sql = `select bucketKey, stopid, imagename from images
              where imageid = ?
    `;
    let params = [assetid];

    let bk = '0'
    let uid = '0'
    let assn = '0'

    let resp = new Promise((resolve, reject) => {
      try 
      {
        //
        // execute the query, and when we get the callback from
        // the database server, either resolve with the results
        // or error with the error object
        //
        photoapp_db.query(sql, params,(err, results, _) => {
          if (err) {
            reject(err);
          }
          else {
            resolve(results);
          }
        });
      }
      catch (err) {
        reject(err);
      }
    });
    
    // 
    // return the PROMISE back to the caller, which will
    // eventually resolve to results or an error:
    //
    let getStuff = await resp;

    if(getStuff.length == 0){
      res.status(400).json({
        "message": "no such image...",
        "stop_id": -1,
        "image_name": "?",
        "bucket_key": "?",
        "data": []
      })
      return
    }
    

    bk = getStuff[0].bucketKey;
    sid = getStuff[0].stopid;
    imgn = getStuff[0].imagename;

    // photoapp_db.query(sql, params, (err, rows) => {
    //   if (err) {
    //     res.status(500).json({ message: err.message, data: [] });
    //     return;
    //   }

    //   // send response in JSON format:
    //   bucketkey = rows;
    //   //res.json({ message: "success", data: rows });
    // });

    const input = { // GetObjectRequest
      Bucket: s3_bucket_name, // required
      Key: bk, // required
    };
    console.log(bk)
    const command = new GetObjectCommand(input);
    console.log('command sent')
    const response = await photoapp_s3.send(command);
    console.log('response gotten')
    var datastr = await response.Body.transformToString("base64");
    console.log('transformed')

    const buff = Buffer.from(datastr, 'base64');
    console.log(buff)

    let resp2 = new Promise((resolve, reject) => {
      try 
      {
        //
        // execute the query, and when we get the callback from
        // the database server, either resolve with the results
        // or error with the error object
        //
        inflate(buff, (err, buffer) => {
          if (err) {
            reject(err);
          }
          else {
            resolve(buffer)
          }
        });
      }
      catch (err) {
        reject(err);
      }
    });

    let getStuff2 = await resp2;
    datastr = getStuff2.toString()


    console.log('datastr made')

    res.json({ message: "success", stop_id: sid, image_name: imgn, bucket_key: bk, data: datastr });

  }//try
  catch (err) {
    console.log("**Error in /image");
    console.log(err.message);
    
    res.status(500).json({
      "message": err.message,
      "stop_id": -1,
      "image_name": "?",
      "bucket_key": "?",
      "data": []
    });
  }//catch

}//get