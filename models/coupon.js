const mongoose = require('mongoose')
const Schema = mongoose.Schema
const passportLocalMongoose = require('passport-local-mongoose');
var Coupon = new Schema({
    couponValue:{
        type: String
    },
    couponCode:{
        type: String
    },
    slug:{
        type: String
    },
    couponQuantity:{
        type: Number
    },
    couponStatus:{
        type: Number
    },
    couponType:{
        type: Number
    },
    userID:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
    start_date:{
        type: String
    },
    end_date:{
        type: String
    },
    created_by:{
        type: String
    },
    updated_by:{
        type: String
    },
    username:{
        type: Number
    },  
})
  
Coupon.plugin(passportLocalMongoose);
  
module.exports = mongoose.model('Coupon', Coupon)
