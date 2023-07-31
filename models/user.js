const mongoose = require('mongoose')
const Schema = mongoose.Schema
const passportLocalMongoose = require('passport-local-mongoose');
var User = new Schema({
    fullname:{
        type: String
    },
    email:{
        type: String
    },
    password: {
        type: String
    },
    username: {
        type: String
    },
    phone: {
        type: String
    },
    avatar: {
        type: String
    },
    limit: {
        type: Number
    },
})
  
User.plugin(passportLocalMongoose);
  
module.exports = mongoose.model('User', User)
