const { createPool } = require("mysql");

//using conection pool to keep the connection open
//this way we can use the same connection for multiple queries
//and we don't have to open and close the connection every time
//we want to execute a query
//big tech companies use connection pools to handle multiple requests
//it we don't do connection pooling then we will have to open the connection again and again it will be very slow due three way handshake
const pool = createPool({
  host: "127.0.0.1",
  user: "wxomi",
  password: "wxomi",
  database: "AirlineCheckIn",
});

const bookSeat = (userId, tripId) => {
  return new Promise((resolve, reject) => {
    pool.getConnection((error, connection) => {
      if (error) {
        reject(error);
        return;
      }
      connection.beginTransaction((error) => {
        if (error) {
          reject(error);
          return;
        }

        const selectQuery =
          "SELECT id, name, trip_id, user_id FROM Seats WHERE trip_id = ? AND user_id IS NULL LIMIT 1 FOR UPDATE"; //Skip locked TO PREVENT DEADLOCK SITUATIONS
        connection.query(selectQuery, [tripId], (error, results) => {
          if (error) {
            connection.rollback(() => {
              connection.release();
              reject(error);
            });
            return;
          }

          if (results.length === 0) {
            connection.rollback(() => {
              connection.release();
              resolve("No available seats.");
            });
            return;
          }

          const updateQuery = "UPDATE Seats SET user_id = ? WHERE id = ?";
          connection.query(
            updateQuery,
            [userId, results[0].id],
            (error, updateResults) => {
              if (error) {
                connection.rollback(() => {
                  connection.release();
                  reject(error);
                });
              } else {
                connection.commit((error) => {
                  if (error) {
                    connection.rollback(() => {
                      connection.release();
                      reject(error);
                    });
                  } else {
                    connection.release();
                    console.log(userId, "booked a seat.", results[0].id);
                    resolve(`${userId} - ${results[0].id}`);
                  }
                });
              }
            }
          );
        });
      });
    });
  });
};

const numThreads = 120;
const bookingPromises = [];
for (let i = 1; i <= numThreads; i++) {
  bookingPromises.push(bookSeat(i, 1));
}

Promise.all(bookingPromises)
  .then((results) => {
    console.log(results);
    console.log("All booking processes completed.");
    pool.end();
  })
  .catch((error) => {
    console.error("Error during booking processes:", error);
    pool.end();
  });
