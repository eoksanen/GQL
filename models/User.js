const mongoose = require('mongoose')

const userSchema = mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true,
    minlength: 3
  },
  name: String,
  favoriteGenre: String
 // passwordHash: String,
  
})

const User = mongoose.model('User', userSchema)

module.exports = User