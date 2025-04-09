//
// app.get('/stats', async (req, res) => {...});
//
// return some stats about our bucket and database:
//
const photoapp_db = require('./photoapp_db.js')
const { HeadBucketCommand } = require('@aws-sdk/client-s3');
const { photoapp_s3, s3_bucket_name, s3_region_name } = require('./photoapp_s3.js');


//
// query_database:
//
// Queries database, returning a PROMISE that you can
// await on. When the PROMISE resolves, you'll have the 
// results of your query (or you'll get an error thrown
// back).
//
function query_database(db, sql)
{
  let response = new Promise((resolve, reject) => {
    try 
    {
      //
      // execute the query, and when we get the callback from
      // the database server, either resolve with the results
      // or error with the error object
      //
      db.query(sql, (err, results, _) => {
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
  return response;
}


//
// get /stats:
//
exports.get_stats = async (req, res) => {

  console.log("**Call to get /stats...");

  try 
  {
    //
    // calling S3 to get bucket status, returning a PROMISE
    // we have to wait on eventually:
    //
    // build input object for S3 with request parameters:
    let input = {
      Bucket: s3_bucket_name
    };

    console.log("/stats: calling S3...");

    let command = new HeadBucketCommand(input);
    let s3_promise = photoapp_s3.send(command); 

    //
    // calling MySQL to get # of users. For consistency, we 
    // turn each DB call with callback into a PROMISE so 
    // we can wait for it while we wait for the other 
    // responses...
    //
    let sql = `
        Select count(*) As NumStops From stops;
        `;
   
    console.log("/stats: calling RDS to get # of stops...");
    
    let mysql_promise1 = query_database(photoapp_db, sql);
    
    //
    // now execute another query to get # of assets:
    //
    sql = `
        Select count(*) As NumImages From images;
        `;
   
    console.log("/stats: calling RDS to get # of assets...");
    
    let mysql_promise2 = query_database(photoapp_db, sql);

    //
    // nothing else to do, so let's asynchronously wait
    // for ALL the promises to resolve / reject. Note that 
    // when this resolves, we have a LIST of results, one
    // per PROMISE. Then we have to extract from each
    // result...
    //
    let results = await Promise.all([s3_promise, mysql_promise1, mysql_promise2]);
    
    // extract the s3 result:
    let s3_results = results[0];
    let metadata = s3_results["$metadata"];
    
    // extract # of users, which is a list with exactly one row:
    let rds_user_results = results[1];
    let user_row = rds_user_results[0];
    
    // likewise # of assets:
    let rds_asset_results = results[2];
    let asset_row = rds_asset_results[0];
    
    //
    // done, respond with stats:
    //
    console.log("/stats done, sending response...");

    res.json({
      "message": "success",
      "s3_status": metadata["httpStatusCode"],
      "db_numStops": user_row["NumStops"],
      "db_numImages": asset_row["NumImages"]
    });
  }//try
  catch (err)
  {
    //
    // generally we end up here if we made a 
    // programming error, like undefined variable
    // or function, or bad SQL:
    //
    console.log("**Error in /stats");
    console.log(err.message);
    
    res.status(500).json({
      "message": err.message,
      "s3_status": -1,
      "db_numStops": -1,
      "db_numImages": -1
    });
  }//catch

}//get
