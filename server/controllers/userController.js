require("dotenv").config();
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
// const Expense = require('../models/expenseModel');
const { User, Expense } = require("../models/userModel");
const redisClient = require("../utils/redisClient"); // Adjust the path if needed
const jwt = require("jsonwebtoken");
const validator = require("validator");
const nodemailer = require('nodemailer');

// Registers a new user '/api/users'
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, PhoneNumber } = req.body;

  // Basic validation
  if (!name || !email || !password || !PhoneNumber) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Validate email format
  if (!validator.isEmail(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  // Validate phone number format
  if (PhoneNumber.length !== 13) {
    return res.status(400).json({ message: "Invalid phone number format" });
  }

  try {
    // Check if the user already exists by both email or phone number
    const existingUser = await User.findOne({
      $or: [{ email }, { PhoneNumber }],
    });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      PhoneNumber,
    });

    await newUser.save();

    // Generate JWT token
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    return res
      .status(201)
      .json({ message: "User created successfully", token });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});


const getUserDetails = asyncHandler(async (req, res) => {
  const { userId, email } = req.params; // Get userId or email from URL parameters

  try {
    let user;

    // Ensure the User model is available
    if (!User) {
      return res.status(500).json({ message: "User model not found" });
    }

    // Check if userId or email is provided and fetch accordingly
    if (userId) {
      user = await User.findById(userId); // Find by userId
    } else if (email) {
      user = await User.findOne({ email }); // Find by email
    } else {
      return res.status(400).json({ message: "User ID or Email is required" });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Exclude password from the returned user details
    const { password, ...userDetails } = user.toObject();

    return res.status(200).json({ user: userDetails });
  } catch (error) {
    console.error(error); // Log the error for debugging
    res.status(500).json({ message: "Server error" });
  }
});


// Add a new expense
const addExpense = asyncHandler(async (req, res) => {
  const { userEmail, amount, description, splitMethod, participants } = req.body;

  try {
    // Find the user making the expense
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create an array of participant emails from the request
    const participantEmails = [...new Set([userEmail, ...participants.map(p => p.participant)])];

    // Check if all participants exist in the database
    const foundParticipants = await User.find({ email: { $in: participantEmails } });

    // If not all participants are found
    if (foundParticipants.length !== participantEmails.length) {
      const missingEmails = participantEmails.filter(email =>
        !foundParticipants.some(participant => participant.email === email)
      );
      return res.status(404).json({ message: `Participant(s) not found: ${missingEmails.join(', ')}` });
    }

    // Initialize variables to store the sum of provided shares or percentages
    let totalShares = 0;
    let totalPercentage = 0;
    let userEmailParticipant = null;

    // Map the found participants and handle share/percentage calculation
    const mappedParticipants = foundParticipants.map((foundUser) => {
      const participantData = participants.find(p => p.participant === foundUser.email);
      let participantDetail = {
        participant: foundUser._id, // Store participant's ObjectId
      };

      if (splitMethod === 'equal') {
        participantDetail.share = amount / foundParticipants.length; // Equal share
      } else if (splitMethod === 'exact') {
        if (participantData && participantData.share) {
          participantDetail.share = participantData.share; // Use provided share
          totalShares += participantDetail.share;
        } else if (foundUser.email === userEmail) {
          // Track userEmail participant for later share calculation
          userEmailParticipant = participantDetail;
        } else {
          return res.status(400).json({ message: `Exact share not provided for participant: ${foundUser.email}` });
        }
      } else if (splitMethod === 'percentage') {
        if (participantData && participantData.percentage) {
          if (isNaN(participantData.percentage) || participantData.percentage <= 0) {
            return res.status(400).json({ message: `Invalid percentage for participant: ${foundUser.email}` });
          }
          participantDetail.percentage = participantData.percentage; // Use provided percentage
          participantDetail.share = (amount * participantData.percentage) / 100; // Calculate share based on percentage
          totalPercentage += participantData.percentage;
        } else if (foundUser.email === userEmail) {
          // Track userEmail participant for later percentage calculation
          userEmailParticipant = participantDetail;
        } else {
          return res.status(400).json({ message: `Percentage not provided for participant: ${foundUser.email}` });
        }
      }

      return participantDetail;
    });

    // Handle the remaining share for userEmail (initiator) in 'exact' split method
    if (splitMethod === 'exact' && userEmailParticipant) {
      const remainingShare = amount - totalShares;
      if (remainingShare <= 0) {
        return res.status(400).json({ message: "The provided shares exceed or equal the total amount." });
      }

      // Set the remaining share for the userEmail
      userEmailParticipant.share = remainingShare;
      mappedParticipants.push(userEmailParticipant);
    }

    // Handle the remaining percentage for userEmail (initiator) in 'percentage' split method
    if (splitMethod === 'percentage' && userEmailParticipant) {
      const remainingPercentage = 100 - totalPercentage;
      if (remainingPercentage <= 0) {
        return res.status(400).json({ message: "The provided percentages exceed or equal 100%." });
      }

      // Set the remaining percentage and share for the userEmail
      userEmailParticipant.percentage = remainingPercentage;
      userEmailParticipant.share = (amount * remainingPercentage) / 100;
      mappedParticipants.push(userEmailParticipant);
    }

    // Remove duplicate participants if they exist
    const uniqueParticipants = mappedParticipants.reduce((acc, curr) => {
      if (!acc.some(p => p.participant.toString() === curr.participant.toString())) {
        acc.push(curr);
      }
      return acc;
    }, []);

    // Save the expense
    const expense = new Expense({
      user: user._id,
      amount,
      description,
      splitMethod,
      participants: uniqueParticipants,
    });

    await expense.save();

    // Send emails to participants after saving the expense
    await sendEmailsToParticipants(foundParticipants, amount, description, uniqueParticipants);

    // Respond with success
    return res.status(201).json({ message: "Expense added successfully", expense });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Function to send emails to participants
const sendEmailsToParticipants = async (participants, amount, description, participantDetails) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail', // Replace with your email service (e.g., Gmail, SendGrid, etc.)
    auth: {
      user: process.env.EMAIL_USER, // Your email
      pass: process.env.EMAIL_PASS, // Your email password or app-specific password
    },
  });

  // Iterate over participants and send individual emails
  for (let i = 0; i < participants.length; i++) {
    const participant = participants[i];
    const participantDetail = participantDetails.find(p => p.participant.toString() === participant._id.toString());

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: participant.email,
      subject: 'Expense Participation Notification',
      text: `Hi ${participant.name},\n\nYou have been added to an expense: "${description}".\nYour share of the amount is: ${participantDetail.share}.\n\nThank you!`,
    };

    await transporter.sendMail(mailOptions);
  }
};
// Retrieve Individual User Expenses (by email or ID)
exports.getUserExpenses = async (req, res) => {
  try {
    const { userEmail, amount, description, splitMethod, participants } =
      req.body;

    // Check if userEmail is provided
    if (!userEmail) {
      return res.status(400).json({ message: "User email is required" });
    }

    if (!amount || !description || !splitMethod || !participants) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Find the user by email to get their ObjectId
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Process participants to get their ObjectId based on email
    const participantDetails = await Promise.all(
      participants.map(async (participant) => {
        let participantUser;
        if (participant.email) {
          // Search user by email to get ObjectId
          participantUser = await User.findOne({ email: participant.email });
        }

        if (!participantUser) {
          return res
            .status(404)
            .json({ message: `Participant not found: ${participant.email}` });
        }

        return {
          participant: participantUser._id, // Store the ObjectId of the participant
          share: participant.share,
          percentage: participant.percentage,
        };
      })
    );

    // Create the expense record
    const expense = new Expense({
      user: user._id, // Store the ObjectId of the main user
      amount,
      description,
      splitMethod,
      participants: participantDetails,
    });

    await expense.save();
    return res
      .status(201)
      .json({ message: "Expense added successfully", expense });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get individual user expenses
const getUserExpenses = async (req, res) => {
  const { userId } = req.params;

  try {
    const expenses = await Expense.find({
      "participants.participant": userId,  // Filters for the userId in participants
    }).populate("user participants.participant");

    // Filter the populated expenses to only include the specified participant's data
    const filteredExpenses = expenses.map(expense => {
      const filteredParticipants = expense.participants.filter(participant =>
        participant.participant.toString() === userId.toString()
      );
      expense.participants = filteredParticipants;  // Retain only the relevant participant data
      return expense;
    });

    res.status(200).json(filteredExpenses);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving user expenses", error });
  }
};



// Get overall expenses
const getOverallExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find().populate(
      "user participants.participant"
    );
    res.status(200).json(expenses);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving overall expenses", error });
  }
};

// Download balance sheet (For simplicity, we'll send JSON response)
const downloadBalanceSheet = async (req, res) => {
  const { userId } = req.params; // Optional if you want to filter based on userId

  try {
    // Fetch expenses and populate relevant fields
    const expenses = await Expense.find().populate("user participants.participant");

    // Prepare data for CSV
    const csvRows = [];
    // Add header row: Include fields such as Expense ID, User Email, Amount, Description, Participant Email, Share, Percentage
    csvRows.push("Expense ID,Amount,Description,User Email,Participant Email,Share,Percentage");

    // Loop through expenses and participants to gather the required data
    expenses.forEach(expense => {
      expense.participants.forEach(participant => {
        const userEmail = expense.user.email; // Assuming the user is populated
        const participantEmail = participant.participant.email; // Assuming participant is populated
        const share = participant.share || 0;
        const percentage = participant.percentage || 0;

        // Add a row for each participant associated with the expense
        csvRows.push(`${expense._id},${expense.amount},"${expense.description}",${userEmail},${participantEmail},${share},${percentage}`);
      });
    });

    // Convert array to CSV format
    const csvString = csvRows.join("\n");

    // Set headers to indicate a file download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=balance_sheet.csv");

    // Send the CSV data as a response
    res.status(200).send(csvString);

  } catch (error) {
    res.status(500).json({ message: "Error downloading balance sheet", error });
  }
};


module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
  addExpense,
  getUserExpenses,
  getOverallExpenses,
  downloadBalanceSheet,
  getUserDetails,
};
