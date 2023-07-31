const mongoose = require('mongoose')
const Schema = mongoose.Schema
const passportLocalMongoose = require('passport-local-mongoose');
var Admin = new Schema({
    fullname:{
        type: String
    },
    email:{
        type: String
    },
    username: {
        type: String
    },
    password: {
        type: String
    },
    role: {
        type: Number
    },
    status: {
        type: Number
    },
})
  
Admin.plugin(passportLocalMongoose);
  
module.exports = mongoose.model('Admin', Admin)
