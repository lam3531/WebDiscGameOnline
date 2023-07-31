const mongoose = require('mongoose')
const Schema = mongoose.Schema
const passportLocalMongoose = require('passport-local-mongoose');
const moment = require("moment-timezone");
const dateVietNam = moment.tz(Date.now(), "Asia/Ho_Chi_Minh");

var Warehouse = new Schema({
    productID:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    },
    quantityIn:{
        type: Number
    },
    created_by:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    created_date:{
        type: String
    },
    username:{
        type: Number
    },
})
  
Warehouse.plugin(passportLocalMongoose);
  
module.exports = mongoose.model('Warehouse', Warehouse)