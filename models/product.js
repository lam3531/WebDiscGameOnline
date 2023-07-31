const mongoose = require('mongoose')
const Schema = mongoose.Schema
const passportLocalMongoose = require('passport-local-mongoose');
const moment = require("moment-timezone");
var Product = new Schema({
    productName:{
        type: String
    },
    slug:{
        type: String
    },
    productDescription:{    
        type: String
    },
    productImage:{
        type: String
    },
    categoryID:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    }],
    producerID:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Producer'
    },
    priceIn:{
        type: String
    },
    priceOut:{
        type: String
    },
    productStatus:{
        type: Number
    },
    productQuantity:{
        type: Number,
        default: 0,
    },
    created_date:{
        type: String
    },
    updated_date:{
        type: String
    },
    created_by:{
        type: String
    },
    updated_by:{
        type: String
    },
    userID:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    username:{
        type: Number
    },
})
Product.plugin(passportLocalMongoose);
  
module.exports = mongoose.model('Product', Product)
