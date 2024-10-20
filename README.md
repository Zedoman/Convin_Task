# Expense Manager API
This is a simple API for managing shared expenses. It allows users to split expenses among multiple participants and store these records in a MongoDB database. The project uses Node.js, Express, and Mongoose for the backend, with Nodemailer for email notifications.

# Table of Contents
Features
Installation
Usage
API Endpoints
Error Handling

# Features
Add shared expenses with participants.
Split expenses by different methods (equal, exact, percentage).
Email notifications sent to users when a new expense is added.
MongoDB database integration with Mongoose.


# Installation
1. Prerequisites
Make sure the following are installed on your system:

Node.js (v14.x or higher)
MongoDB (either local or cloud service like MongoDB Atlas)

2. Clone the Repository
git clone https://github.com/Zedoman/Convin_Task.git

3. Install Dependencies
npm i

4. Set Up Environment Variables
Create a .env file in the root directory of the project and add the variables based on the .env.sample

5. Start the Server
To start the API server, run the following command:
nodemon server.js


# Usage
Adding an Expense:

Add an expense by making a POST request to the API with details like amount, description, participants, and the method for splitting the expense (equal, exact, or percentage).
Participants should be identified by their email addresses.
Splitting Methods:

Equal: Splits the expense equally among participants.
Exact: Allows specifying exact amounts for each participant.
Percentage: Splits the expense based on specified percentages for each participant.


# API Endpoints
To register user
http://localhost:5001/api/users/register <br>
[json format: {
  "name": "Surjo",
  "email": "avradeepni@gmail.com",
  "password": "hashed_password",
  "PhoneNumber": "+919733057338"}.. more we can add as required]

To get User details
http://localhost:5001/api/users/id/:userId

Add Expense
http://localhost:5001/api/users/expenses <br>
[Json Format: // {
//   "userEmail": "avradeepri@gmail.com",  // Your user ID
//   "amount": 3000,
//   "description": "Dinner with friends",
//   "splitMethod": "equal",
//   "participants": [
//     {
//       "participant": "avradeepnayak@gmail.com"  // Friend 1's user ID
//     },
//     {
//       "participant": "avradeepn@gmail.com"  // Friend 2's user ID
//     }
//   ]
// }


// {
//   "userEmail": "avradeepri@gmail.com",  
//   "amount": 3000,
//   "description": "Dinner with friends",
//   "splitMethod": "exact",
//   "participants": [
//       {
//         "participant": "avradeepnayak@gmail.com",
//         "share": 500
//       },
//       {
//         "participant": "avradeepn@gmail.com",
//         "share": 1000
//       }
//   ]
// }


// {
//   "userEmail": "avradeepri@gmail.com",
//   "amount": 3000,
//   "description": "Dinner with friends",
//   "splitMethod": "percentage",
//   "participants": [
//     {
//       "participant": "avradeepnayak@gmail.com",
//       "percentage": 20
//     },
//     {
//       "participant": "avradeepn@gmail.com",
//       "percentage": 50
//     }
//   ]
// }

]

Get individual user expenses
http://localhost:5001/api/users/expenses/user/:userId

Get overall expenses
http://localhost:5001/api/users/expenses/summary

Download balance sheet
http://localhost:5001/api/users/expenses/balance-sheet


# Error Handling
1. 400 Bad Request: When required fields are missing or the input is invalid.
2. 404 Not Found: When a user or participant is not found in the database.
3. 500 Internal Server Error: When something goes wrong on the server (e.g., database connection issues).
