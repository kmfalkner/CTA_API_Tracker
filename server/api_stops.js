//
// app.get('/users', async (req, res) => {...});
//
// Return all the users from the database:
//
const photoapp_db = require('./photoapp_db.js')

exports.get_stops = async (req, res) => {

  console.log("**Call to get /stops...");

  try {

    //
    // TODO: remember we did an example similar to this in class with
    // movielens database
    //
    // MySQL in JS:
    //   https://expressjs.com/en/guide/database-integration.html#mysql
    //   https://github.com/mysqljs/mysql
    //
    let sql = `select * from stops 
              order by stopid asc
    `;
    let params = [];

    photoapp_db.query(sql, params, (err, rows) => {
      if (err) {
        res.status(500).json({ message: err.message, data: [] });
        return;
      }

      // send response in JSON format:
      console.log("sending response");
      res.json({ message: "success", data: rows });
    });

    console.log("about to return");

  }//try
  catch (err) {
    console.log("**Error in /users");
    console.log(err.message);
    
    res.status(500).json({
      "message": err.message,
      "data": []
    });
  }//catch

}//get
