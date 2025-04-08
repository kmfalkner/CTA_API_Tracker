//
// app.post('/image/:userid', async (req, res) => {...});
//
// Uploads an image to the bucket and updates the database,
// returning the asset id assigned to this image.
//
const photoapp_db = require('./photoapp_db.js')
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { photoapp_s3, s3_bucket_name, s3_region_name } = require('./photoapp_s3.js');
const { deflate } = require('node:zlib');

const uuid = require('uuid');

exports.post_image = async (req, res) => {

  console.log("**Call to post /image/:stopid...");

  try {

    let data = req.body;  // data => JS object

    sid = req.params.stopid

    console.log(sid)

    let sql = `select stopname from stops
    where stopid = ?`

    let params = [sid]

    let response = new Promise((resolve, reject) => {
      try 
      {
        //
        // execute the query, and when we get the callback from
        // the database server, either resolve with the results
        // or error with the error object
        //
        photoapp_db.query(sql, params, (err, results, _) => {
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
    
    let exists = await response
    if (exists.length == 0){
      res.status(400).json({
        "message": "no such stop...",
        "assetid": -1
      })
      return
    }

    let bf = exists[0].stopname
    let name = bf + "/" + uuid.v4() //+ ".jpg"

    let S = data["data"];
    let bytes = 0
    //let bytes =  Buffer.from(S, 'base64');

    let response3 = new Promise((resolve, reject) => {
      try 
      {
        //
        // execute the query, and when we get the callback from
        // the database server, either resolve with the results
        // or error with the error object
        //
        deflate(S, (err, buffer) => {
          if (err) {
            reject(err)
          }
            resolve(buffer)
          console.log('bytes set to buff')
        });
      }
      catch (err) {
        reject(err);
      }
    });

    let exists2 = await response3
    bytes = exists2
    
    console.log(typeof bytes)
    console.log(bytes)

    const input = {
      Bucket: s3_bucket_name,
      Key: name,
      Body: bytes,
      ContentType: "application/octet-stream",
      ACL: "public-read"
    };

    const command = new PutObjectCommand(input);
    const resp = await photoapp_s3.send(command);

    sql = `INSERT INTO images(stopid, imagename, bucketkey)
    values(?,?,?)`;

    params = [sid, data["imagename"], name]

    let response2 = new Promise((resolve, reject) => {
      try 
      {
        //
        // execute the query, and when we get the callback from
        // the database server, either resolve with the results
        // or error with the error object
        //
        photoapp_db.query(sql, params, (err, results, _) => {
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

    success = await response2
    if(success.affectedRows == 1){
      res.json({ message: "success", imageid: success.insertId});
    }
    else{
      res.json({ message: "some sort of error message", assetid: -1});
    }
	
  }//try
  catch (err) {
    console.log("**Error in /image");
    console.log(err.message);
    
    res.status(500).json({
      "message": err.message,
      "assetid": -1
    });
  }//catch

}//post
