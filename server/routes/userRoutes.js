const express = require("express");
const { body } = require('express-validator');
const {
  registerUser, addExpense, getUserExpenses, getOverallExpenses, 
  downloadBalanceSheet, getUserDetails
} = require("../controllers/userController");
const jwt = require('jsonwebtoken');
const recaptchaMiddleware = require('../middlewares/recaptchaMiddleware');

const router = express.Router();

// User routes
//router.post("/", recaptchaMiddleware,registerUser); //If we want to use recaptcha can use it. As this is frontend implementation so i am commenting out
router.post("/register", [ body('name').not().isEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Email must be valid'),
  body('password').isMobilePhone().withMessage('Password required'),
  body('PhoneNumber').isMobilePhone().withMessage('Phone number should be valid'),
], registerUser);

//get user details using id or email
router.get("/id/:userId", getUserDetails); 
// router.get("/:email", getUserDetails);


// Add expense
router.post('/expenses', addExpense);

// Get individual user expenses
router.get('/expenses/user/:userId', getUserExpenses);

// Get overall expenses
router.get('/expenses/summary', getOverallExpenses);

// Download balance sheet
router.get('/expenses/balance-sheet', downloadBalanceSheet);


module.exports = router;
