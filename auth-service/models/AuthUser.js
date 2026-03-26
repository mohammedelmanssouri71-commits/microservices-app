const mongoose = require('mongoose')

const AuthUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  token: { type: String, default: null }
})

module.exports = mongoose.model('AuthUser', AuthUserSchema)
