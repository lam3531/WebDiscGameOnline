const mongoose = require('mongoose')
const Schema = mongoose.Schema
const passportLocalMongoose = require('passport-local-mongoose');
var Sale = new Schema({
    month:{
        type: Number
    },
    year:{
        type: Number
    },
    moneyIn: {
        type: Number
    },
    moneyOut: {
        type: Number
    },
    revenue: {
        type: Number
    },
    username: {
        type: String
    },
})
  
Sale.plugin(passportLocalMongoose);
  
module.exports = mongoose.model('Sale', Sale)
