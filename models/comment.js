const mongoose = require('mongoose')
const Schema = mongoose.Schema
const passportLocalMongoose = require('passport-local-mongoose');
const moment = require("moment-timezone");
var Comment = new Schema({
    productID:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    },
    userID:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    commentInfo:{
        type: String
    },
    commentStatus:{
        type: Number
    },
    commentDate:{
        type: String
    },
    username:{
        type: Number
    },
})
Comment.plugin(passportLocalMongoose);
  
module.exports = mongoose.model('Comment', Comment)