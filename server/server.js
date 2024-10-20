const path = require("path");
const express = require("express");
const colors = require("colors");
const cors = require("cors");
const dotenv = require("dotenv").config();
const { errorHandler } = require("./middlewares/errorMiddleware");
const { connectDB } = require("./config/db");
const session = require('express-session');
const PORT = process.env.PORT || 3000;

// Connect to Mongo database
connectDB();

const app = express();

app.use(cors());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
}));

// Middleware to parse JSON and URL-encoded data
//app.use(bodyParser.json({ limit: '50mb' })); 
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: false }));

// Error handling middleware
app.use(errorHandler);

//User Routes
app.use("/api/users", require("./routes/userRoutes"));



//If we are doing it for production
// if (process.env.NODE_ENV === "production") {
//   // Set build folder as static
//   app.use(express.static(path.join(__dirname, "../frontend/build")));

//   app.get("*", (req, res) =>
//     res.sendFile(path.resolve(__dirname, "../frontend", "build", "index.html"))
//   );
// } else {
//   // Default route
//   app.get("/", (req, res) => {
//     res.status(200).json({ message: "Welcome to Convin_Backend_Task" });
//   });
// }


app.listen(PORT, () => console.log(`Server started on port ${PORT}`));