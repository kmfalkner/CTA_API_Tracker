//
// Express js (and node.js) web service that interacts with 
// AWS S3 and RDS to provide clients data for building a 
// simple photo application for photo storage and viewing.
//
// Authors:
//  YOUR NAME
//  Prof. Joe Hummel (initial template)
//  Northwestern University
//
// References:
// Node.js: 
//   https://nodejs.org/
// Express: 
//   https://expressjs.com/
// MySQL: 
//   https://expressjs.com/en/guide/database-integration.html#mysql
//   https://github.com/mysqljs/mysql
// AWS SDK with JS:
//   https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/index.html
//   https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/getting-started-nodejs.html
//   https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/
//   https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html
//

const express = require('express');
const app = express();
const config = require('./config.js');

const photoapp_db = require('./photoapp_db.js')
const { HeadBucketCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { photoapp_s3, s3_bucket_name, s3_region_name } = require('./photoapp_s3.js');

// support larger image uploads/downloads:
app.use(express.json({ strict: false, limit: "50mb" }));

var startTime;

//
// main():
//
app.listen(config.service_port, () => {
  startTime = Date.now();
  console.log('**Web service running, listening on port', config.service_port);
  //
  // Configure AWS to use our config file:
  //
  process.env.AWS_SHARED_CREDENTIALS_FILE = config.photoapp_config;
});

//
// request for default page /
//
app.get('/', (req, res) => {
  try {
    console.log("**Call to /...");
    
    let uptime = Math.round((Date.now() - startTime) / 1000);

    res.json({
      "status": "running",
      "uptime-in-secs": uptime,
      "dbConnection": photoapp_db.state
    });
  }
  catch(err) {
    console.log("**Error in /");
    console.log(err.message);

    res.status(500).json(err.message);
  }
});

//
// web service functions (API):
//
let stats = require('./api_stats.js');
let stops = require('./api_stops.js');
let images = require('./api_images.js');
let download = require('./api_image_get.js');
let upload = require('./api_image_post.js');
let travel_time = require('./api_travel_time.js')

app.get('/stats', stats.get_stats);  
app.get('/stops', stops.get_stops);  
app.get('/images', images.get_images);  
app.get('/image/:imageid', download.get_image);
app.get('/travel_time/:stopone/:stoptwo', travel_time.get_travel_time)

app.post('/image/:stopid', upload.post_image);

// http://localhost:8080/travel_time/30274/30256?stopthree=30257&stopfour=30277

