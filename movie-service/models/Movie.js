const mongoose = require('mongoose')

const MovieSchema = new mongoose.Schema({
  title: { type: String, required: true },
  userId: { type: String, required: true }
})

module.exports = mongoose.model('Movie', MovieSchema)
