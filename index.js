const { createPool } = require("mysql");

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
      const selectQuery =
        "SELECT id, name, trip_id, user_id FROM Seats WHERE trip_id = ? AND user_id IS NULL LIMIT 1";
      connection.query(selectQuery, [tripId], (error, results) => {
        if (error) {
          connection.release(); // Release the connection back to the pool
          reject(error);
          return;
        }

        if (results.length === 0) {
          connection.release(); // Release the connection back to the pool
          resolve("No available seats.");
          return;
        }

        const seatId = results[0].id;
        const updateQuery = "UPDATE Seats SET user_id = ? WHERE id = ?";
        connection.query(
          updateQuery,
          [userId, seatId],
          (error, updateResults) => {
            connection.release(); // Release the connection back to the pool
            if (error) {
              reject(error);
            } else {
              resolve(
                `User ${userId} successfully booked a seat for trip ${tripId}`
              );
            }
          }
        );
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
