const xmlFormat = require('xml-formatter');
const { XMLParser } = require('fast-xml-parser');
const photoapp_db = require('./photoapp_db.js')

// Function to fetch data from an API
async function fetchApi(url) {
    try {
      // Make the API request
      const response = await fetch(url);
  
      // Check if the response status is OK (status code 200-299)
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
  
      // Parse the response as JSON
      const data = await response.text();
      const formatted = xmlFormat(data);
      return formatted;
    } catch (error) {
      // Handle any errors that occur during the fetch
      console.error("Error occurred while fetching data:", error);
    }
  }
  
  // Main function to call fetchApi
exports.get_travel_time = async (req, res) => {
    try {
        const parser = new XMLParser();
        stop_ids = [];
        counter = 0;
        travel_times = [];
        leg = 1;
        total_arrival_seconds = [];

        sql = `select * from stops
                where stopid = ? or stopid = ?`


        stopone = req.params.stopone
        stoptwo = req.params.stoptwo

        stop_ids.push(stopone)
        stop_ids.push(stoptwo)

        if (req.query.stopthree){
            stop_ids.push(req.query.stopthree)
        }

        if (req.query.stopfour){
            stop_ids.push(req.query.stopfour)
            sql = `select * from stops
                    where stopid = ? or stopid = ? or stopid = ? or stopid = ?`
        }

        let resp = new Promise((resolve, reject) => {
            try 
            {
              //
              // execute the query, and when we get the callback from
              // the database server, either resolve with the results
              // or error with the error object
              //
              photoapp_db.query(sql, stop_ids, (err, results, _) => {
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

        let all_stopids = await resp
        if (req.query.stopfour) {
            if (all_stopids.length != 4){
                res.status(400).json({
                    "message": "One of your stop ids is not valid. Please check again.",
                  });
            }
        }
        else {
            if (all_stopids.length != 2){
                res.status(400).json({
                    "message": "One of your stop ids is not valid. Please check again.",
                  });
            }
        }

        for (x in stop_ids) {
            next_x = Number(x) + 1;
            stop_id = stop_ids[x]
            const stop_url = "https://lapi.transitchicago.com/api/1.0/ttarrivals.aspx?key=a979c1a664874776b232e046f75a5e24&stpid=" + stop_id;
            // console.log(stop_url)
            const stop_data = await fetchApi(stop_url);
            parsed_stop_data = parser.parse(stop_data);
            multiple_trains = Array.isArray(parsed_stop_data.ctatt.eta)
            // console.log(parsed_stop_data.ctatt.eta)

            let route_num;
            if (multiple_trains){
                route_num = parsed_stop_data.ctatt.eta[0].rn
            } else {
                route_num = parsed_stop_data.ctatt.eta.rn
            }

            // console.log(route_num)

            const train_url = "https://lapi.transitchicago.com/api/1.0.b/ttfollow.aspx?key=a979c1a664874776b232e046f75a5e24&runnumber=" + route_num;
            // console.log(train_url)
            const train_data = await fetchApi(train_url);
            parsed_train_data = parser.parse(train_data);
            // console.log(parsed_train_data.ctatt)

            // console.log("NEXT STOP ID", stop_ids[next_x])
        
            // Check if data was fetched successfully
            // if (parsed_train_data) {
            //     console.log("API Response:", parsed_train_data.ctatt);
            // }

            for (x in parsed_train_data.ctatt.eta){
                if (parsed_train_data.ctatt.eta[x].stpId == stop_ids[next_x]){
                    
                    arrival = parsed_train_data.ctatt.eta[x].arrT
                    console.log("arrival time", parsed_train_data.ctatt.eta[x].arrT)

                    let date = new Date();
                    let timezoneOffset = date.getTimezoneOffset();
                    let pstOffset = -360;
                    let adjustedTime = new Date(date.getTime() + (pstOffset + timezoneOffset) * 60 * 1000);
                    console.log("current date", adjustedTime)
                    hours = adjustedTime.getHours();
                    minutes = adjustedTime.getMinutes();
                    seconds = adjustedTime.getSeconds();
                    console.log("hours", hours)
                    console.log("minutes", minutes)
                    console.log("seconds", seconds)
                    time_in_seconds = Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds)
                    console.log("current time", time_in_seconds);
                
                    // arrival_time = arrival.substring(10, 17)
                    // console.log("arrival time", arrival_time)
                    const [temp, a_minutes, a_seconds] = arrival.split(':');
                    cutoff = temp.length - 2
                    console.log("TEMP", temp)
                    console.log("CUTOFF", cutoff)
                    a_hours = temp.substring(cutoff, temp.length)
                    console.log("HOURS SUBSTRING", a_hours)
                    console.log("hours", a_hours, "minutes", a_minutes, "seconds", a_seconds)
                    arrival_date_seconds = Number(a_hours) * 3600 + Number(a_minutes) * 60 + Number(a_seconds)
                    console.log(arrival_date_seconds)

                    arrival_seconds = arrival_date_seconds - time_in_seconds
                    console.log(arrival_seconds)
                    total_arrival_seconds.push(arrival_seconds)

                    // Convert the result to hours, minutes, and seconds
                    travel_hours = Math.floor(arrival_seconds / (60 * 60));
                    arrival_seconds = arrival_seconds % 3600
                    travel_minutes = Math.floor(arrival_seconds / (60));
                    arrival_seconds = arrival_seconds % 60
                    travel_seconds = Math.floor(arrival_seconds);

                    travel_time = String(travel_hours) + " hours, " + String(travel_minutes) + " minutes, " + String(travel_seconds) + " seconds";
                    travel_times.push(travel_time);

                    console.log("leg " + String(leg) + ": " + travel_time);
                    leg ++;
                } 
                // console.log(parsed_train_data.ctatt.eta[x])
            }
            console.log("STOP ID:", stop_id)
            if (next_x == stop_ids.length - 1){
                break;
            }
        }
        console.log(travel_times);
        console.log("ARRIVAL SECONDS: ", total_arrival_seconds)
        sum = 0;
        for (i in total_arrival_seconds) {
            sum += total_arrival_seconds[i]
        }
        console.log(sum)

        total_travel_hours = Math.floor(sum / (60 * 60));
        total_arrival_seconds = sum % 3600
        total_travel_minutes = Math.floor(sum / (60));
        total_travel_seconds = sum % 60

        total_travel_time = String(total_travel_hours) + " hours, " + String(total_travel_minutes) + " minutes, " + String(total_travel_seconds) + " seconds";
        console.log("Your estimated travel time is:", total_travel_time)
        response = "Your estimated travel time is: " + total_travel_time

        res.json({
            "message": "success",
            "data": response
        })
    } catch(error) {
        res.status(500).json({
            "message": error.message,
            "data": []
          });
    }
}