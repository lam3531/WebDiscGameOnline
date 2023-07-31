const mongoose = require('mongoose')
const Schema = mongoose.Schema
const passportLocalMongoose = require('passport-local-mongoose');
var Producer = new Schema({
    producerName:{
        type: String
    },
    slug:{
        type: String
    },
    username:{
        type: Number
    },
})
  
Producer.plugin(passportLocalMongoose);
  
module.exports = mongoose.model('Producer', Producer)
