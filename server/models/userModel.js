const mongoose = require('mongoose');

// Define the User Schema
const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  PhoneNumber: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

// Export User model
const User = mongoose.model('User', userSchema);

// Define the Expense Schema
const expenseSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',  // Reference to User model
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  splitMethod: {
    type: String,
    enum: ['equal', 'exact', 'percentage'],
    required: true,
  },
  participants: [
    {
      participant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',  // Reference to User model
        required: true,
      },
      share: Number,  // For exact amounts
      percentage: Number,  // For percentage splits
    }
  ],
}, {
  timestamps: true,
});

// Export Expense model
const Expense = mongoose.model('Expense', expenseSchema);

module.exports = { User, Expense };
