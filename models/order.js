const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");
let Item = new Schema({
  _id:{
    type: mongoose.Schema.Types.ObjectId,
  },
  productID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
  },
  quantity: {
    type: Number,
    default: 1,
  },
});
var Order = new Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  orderCode:{
    type: String,
  },
  adminID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
  },
  paymentMethod: {
    type: String,
  },
  shippingCity: {
    type: String,
    default: "Hà Nội",
  },
  shippingDistrict: {
    type: String,
  },
  shippingWard:{
    type: String,
  },
  shippingAddress: {
    type: String,
  },
  shippingNote: {
    type: String,
  },
  shippingFee: {
    type: Number,
  },
  orderStatus: {
    type: Number,
  },
  cancelReason:{
    type: String,
  },
  cancelFrom:{
    type: String,
  },
  items: [Item],
  shippingName: {
    type: String,
  },
  shippingPhone: {
    type: Number,
  },
  couponCode:{
    type: String,
  },
  total: {
    type: Number,
  },
  day: {
    type: String,
  },
  timeIn: {
    type: String,
  },
  timeOut: {
    type: String,
  },
  time: {
    type: String,
  },
  month: {
    type: Number,
  },
  username: {
    type: Number,
  },
});
Order.plugin(passportLocalMongoose);

module.exports = mongoose.model("Order", Order);
