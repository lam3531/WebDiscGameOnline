const mongoose = require('mongoose')
const Schema = mongoose.Schema
const passportLocalMongoose = require('passport-local-mongoose');
var Category = new Schema({
    categoryName:{
        type: String
    },
    slug:{
        type: String
    },
    username:{
        type: Number
    },  
})
  
Category.plugin(passportLocalMongoose);
  
module.exports = mongoose.model('Category', Category)
