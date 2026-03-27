const mongoose = require('mongoose')

const AuthUserSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  token: { type: String, default: null }
})

module.exports = mongoose.model('AuthUser', AuthUserSchema)
