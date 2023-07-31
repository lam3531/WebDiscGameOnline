const mongoose = require('mongoose')
const Schema = mongoose.Schema
const passportLocalMongoose = require('passport-local-mongoose');
var Password = new Schema({
    userID:{
        type: String
    },
    resetString:{
        type: String
    },
    start_date:{
        type: String
    },
    end_date:{
        type: String
    },
    username:{
        type: Number
    },
})
  
Password.plugin(passportLocalMongoose);
  
module.exports = mongoose.model('Password', Password)
