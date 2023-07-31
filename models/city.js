const mongoose = require('mongoose')
const Schema = mongoose.Schema
const passportLocalMongoose = require('passport-local-mongoose');
var City = new Schema({
    cityName:{
        type: String
    },
    price:{
        type: Number
    }, 
    username:{
        type: Number
    },  
})
  
City.plugin(passportLocalMongoose);
  
module.exports = mongoose.model('City', City)
