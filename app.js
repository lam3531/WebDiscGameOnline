//Import các thư viện
const express = require("express");
const ejs = require("ejs");
const app = express();
const port = 3000;
const passport = require("passport");
const LocalStrategy = require("passport-local");
const passportLocalMongoose = require("passport-local-mongoose");
const session = require("express-session");
const moment = require("moment-timezone");
const morgan = require("morgan");
const cors = require("cors");
const flash = require("connect-flash");
const collect = require("collect.js");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const Swal = require("sweetalert2");
const csv = require("csvtojson");
const slugify = require('slugify');
const socket = require('socket.io');
const cron = require('node-cron');

app.use(cors());
app.use(flash());

const server = app.listen(port, () => {
  console.log(`App is running on port ${port}`);
});

const dateVietNam = moment
  .tz(Date.now(), "Asia/Ho_Chi_Minh")
  .format("DD/MM/YYYY hh:mm a");
console.log(dateVietNam);

app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", "./views");

app.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

//Mail

let transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "gamingshoplvp@gmail.com",
    pass: "zsxwxpkplctjwyxz",
  },
});

//Money format
const VND = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});

//Mongodb
const mongoose = require("mongoose");
const mongoClient = require("mongodb").MongoClient;
mongoose
  .connect(
    "mongodb+srv://lam:WBz1E8R60tx79jBO@cluster0.19fbi9g.mongodb.net/?retryWrites=true&w=majority",
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(() => console.log("Connected to mongo successfully"))
  .catch((err) => {
    console.error(err);
  });

//models
const Admin = require("./models/admin.js");
const User = require("./models/user.js");
const Category = require("./models/category.js");
const Producer = require("./models/producer.js");
const Product = require("./models/product.js");
const Warehouse = require("./models/warehouse.js");
const Coupon = require("./models/coupon.js");
const City = require("./models/city.js");
const Cart = require("./models/cart.js");
const Order = require("./models/order.js");
const News = require("./models/news.js");
const Password = require("./models/password.js");
const Comment = require("./models/comment.js");
const Sale = require("./models/sale.js");

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//multer
var multer = require("multer");
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/images");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
var upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (
      file.mimetype == "image/bmp" ||
      file.mimetype == "image/png" ||
      file.mimetype == "image/jpeg" ||
      file.mimetype == "image/jpg" ||
      file.mimetype == "image/gif"
    ) {
      cb(null, true);
    } else {
      return cb(new Error("Chỉ được sử dụng hình ảnh cho tính năng này"));
    }
  },
}).single("productImage");

var avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/avatars");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
var avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: function (req, file, cb) {
    if (
      file.mimetype == "image/bmp" ||
      file.mimetype == "image/png" ||
      file.mimetype == "image/jpeg" ||
      file.mimetype == "image/jpg" ||
      file.mimetype == "image/gif"
    ) {
      cb(null, true);
    } else {
      return cb(new Error("Chỉ được sử dụng hình ảnh cho tính năng này"));
    }
  },
}).single("avatar");

var excelStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/excels");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const excelMimeType = [
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
var excelUpload = multer({
  storage: excelStorage,
  fileFilter: function (req, file, cb) {
    if (excelMimeType.includes(file.mimetype)) {
      cb(null, true);
    } else {
      return cb(new Error("Chỉ được sử dụng file excel cho tính năng này"));
    }
  },
}).single("csvFile");

//body-parser
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));

//Random code
function makeid(length) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

//Order code
let previousDate = null;
let counter = 1;

async function generateOrderCode() {
  const currentDate = moment().format("DD-MM-YYYY");

  let uniqueId = counter.toString().padStart(2, "0");
  let orderCode = `GSLP-${currentDate}-${uniqueId}`;

  let isUnique = false;
  while (!isUnique) {
    // Kiểm tra xem mã đơn hàng đã tồn tại trong MongoDB hay chưa
    const result = await Order.findOne({ orderCode: orderCode });
    if (!result) {
      isUnique = true;
    } else {
      // Tăng giá trị counter và tạo lại mã đơn hàng
      counter++;
      if (counter === 100) {
        counter = 1;
      }
      uniqueId = counter.toString().padStart(2, "0");
      orderCode = `GSLP-${currentDate}-${uniqueId}`;
    }
  }

  // Cập nhật lại giá trị previousDate nếu cần thiết
  if (previousDate === null || currentDate !== previousDate) {
    counter = 1;
    previousDate = currentDate;
  }

  counter++;

  return orderCode;
}

//Client
//Đăng nhập tài khoản
app.get("/login", async (req, res) => {
  if (req.session.guest) {
    res.redirect("/");
  } else {
    res.render("layouts/clients/form/login", {
      userid: 1,
      fullname: 1,
      cart: 0,
      error: req.flash("error"),
      errorEmail: req.flash("errorEmail"),
      errorPassword: req.flash("errorPassword"),
      avatar: "user (2).png",
    });
  }
});

//Đăng ký tài khoản
app.get("/signup", (req, res) => {
  if (req.session.guest) {
    res.redirect("/");
  } else {
    res.render("layouts/clients/form/signup", {
      sID: req.sessionID,
      userid: 1,
      fullname: 1,
      cart: 0,
      nameError: req.flash("nameError"),
      mobileError: req.flash("mobileError"),
      usernameError: req.flash("usernameError"),
      boxError: req.flash("boxError"),
      emailError: req.flash("emailError"),
      passwordError: req.flash("passwordError"),
      mobileED: req.flash("mobileED"),
      emailED: req.flash("emailED"),
      nameED: req.flash("nameED"),
      usernameED: req.flash("usernameED"),
      passwordED: req.flash("passwordED"),
      password2ED: req.flash("password2ED"),
      errorUsername: req.flash("errorUsername"),
      errorEmail: req.flash("errorEmail"),
      errorPhone: req.flash("errorPhone"),
      avatar: "user (2).png",
    });
  }
});

//Lưu tài khoản khi đăng ký
app.post("/save", async (req, res) => {
  var box = req.body.checkbox;
  var name = req.body.fullname;
  var email = req.body.email;
  var username = req.body.username;
  var mobile = req.body.phone;
  var password = req.body.password;
  var password2 = req.body.password2;
  var email_regex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  var vnn_regex =
    /^[a-zA-Z'-'\saAàÀảẢãÃáÁạẠăĂằẰẳẲẵẴắẮặẶâÂầẦẩẨẫẪấẤậẬbBcCdDđĐeEèÈẻẺẽẼéÉẹẸêÊềỀểỂễỄếẾệỆfFgGhHiIìÌỉỈĩĨíÍịỊjJkKlLmMnNoOòÒỏỎõÕóÓọỌôÔồỒổỔỗỖốỐộỘơƠờỜởỞỡỠớỚợỢpPqQrRsStTuUùÙủỦũŨúÚụỤưƯừỪửỬữỮứỨựỰvVwWxXyYỳỲỷỶỹỸýÝỵỴzZ]*$/g;
  var vnf_regex = /((09|03|07|08|05)+([0-9]{8})\b)/g;
  var vnp_regex =
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/gm;
  let errorForm = 0;

  if (name == "") {
    req.flash("nameError", "Bạn chưa điền họ và tên!");
    errorForm++;
  }
  if (mobile == "") {
    req.flash("mobileError", "Bạn chưa điền số điện thoại!");
    errorForm++;
  }
  if (email == "") {
    req.flash("emailError", "Bạn chưa điền Email!");
    errorForm++;
  }
  if (username == "") {
    req.flash("usernameError", "Bạn chưa điền tên đăng nhập!");
    errorForm++;
  }
  if (password == "") {
    req.flash("passwordError", "Bạn chưa đặt mật khẩu!");
    errorForm++;
  }
  if (password != "") {
    if (vnp_regex.test(password) == false) {
      req.flash(
        "passwordError",
        "Mật khẩu tối thiểu tám ký tự, ít nhất một chữ cái, một số và một ký tự đặc biệt!"
      );
      errorForm++;
    } else {
      if (password2 == "") {
        req.flash("passwordError", "Vui lòng xác thực lại mật khẩu!");
        req.flash("passwordED", password);
        errorForm++;
      } else {
        if (password != password2) {
          req.flash("passwordError", "Mật khẩu không trùng khớp");
          req.flash("passwordED", password);
          errorForm++;
        } else {
          req.flash("passwordED", password);
          req.flash("password2ED", password2);
        }
      }
    }
  }

  if (username != "") {
    const checkUsername = await User.findOne({ username: username });
    if (checkUsername) {
      req.flash("errorUsername", "Username đã tồn tại");
      req.flash("usernameED", username);
      errorForm++;
    } else {
      req.flash("usernameED", username);
    }
  }
  if (email != "") {
    const checkEmail = await User.findOne({ email: email });
    if (checkEmail) {
      req.flash("errorEmail", "Email đã tồn tại");
      req.flash("emailED", email);
      errorForm++;
    } else {
      if (email_regex.test(email) == false) {
        req.flash("emailError", "Sai định dạng Email!");
        req.flash("emailED", email);
        errorForm++;
      } else {
        let emailED = email;
        req.flash("emailED", emailED);
      }
    }
  }
  if (name != "") {
    if (vnn_regex.test(name) == false) {
      req.flash("nameError", "Sai định dạng Họ và tên!");
      req.flash("nameED", name);
      errorForm++;
    } else {
      let nameED = name;
      req.flash("nameED", nameED);
    }
  }

  if (mobile != "") {
    const checkPhone = await User.findOne({ phone: mobile });
    if (checkPhone) {
      req.flash("errorPhone", "Số điện thoại đã tồn tại");
      req.flash("mobileED", mobile);
      errorForm++;
    } else {
      if (vnf_regex.test(mobile) == false) {
        req.flash("mobileError", "Sai định dạng Số điện thoại!");
        req.flash("mobileED", mobile);
        errorForm++;
      } else {
        let mobileED = mobile;
        req.flash("mobileED", mobileED);
      }
    }
  }

  if (box != "on") {
    errorForm++;
    req.flash("boxError", "Vui lòng đồng ý với điều khoản!");
  }

  if (errorForm != 0) {
    res.redirect("/signup");
  } else {
    var user = User({
      fullname: req.body.fullname,
      email: req.body.email,
      password: req.body.password,
      username: req.body.username,
      phone: req.body.phone,
    });

    user.save().then(function () {
      req.flash("nameED", "");
      req.flash("mobileED", "");
      req.flash("emailED", "");
      req.flash("usernameED", "");
      req.flash("passwordED", "");
      req.flash("password2ED", "");
      res.redirect("/success-signup");
    });
  }
});

// Trang đăng ký thành công
app.get("/success-signup", (req, res) => {
  if (req.session.guest) {
    req.session.destroy();
    res.render("layouts/clients/form/success_signup", {
      fullname: 1,
      userid: 1,
      sID: req.session.sessionID,
      cart: 0,
      avatar: "user (2).png",
    });
  } else {
    res.render("layouts/clients/form/success_signup", {
      fullname: 1,
      userid: 1,
      sID: req.session.sessionID,
      cart: 0,
      avatar: "user (2).png",
    });
  }
});

//Xử lý đăng nhập
app.post("/login", async (req, res) => {
  let errorEmail = req.body.email;
  let email_regex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  let e = 0;
  if (errorEmail == "") {
    req.flash("error", "Vui lòng nhập Email!");
    e++;
  } else {
    if (email_regex.test(errorEmail) == false) {
      req.flash("error", "Sai định dạng Email");
      req.flash("errorEmail", errorEmail);
      e++;
    } else {
      const user = await User.findOne({ email: req.body.email });
      if (user) {
        //Kiểm tra mật khẩu
        let errorPassword = req.body.password;
        if (errorPassword == "") {
          req.flash("errorPassword", "Vui lòng nhập mật khẩu!");
          req.flash("errorEmail", errorEmail);
          e++;
        } else {
          const result = req.body.password === user.password;
          if (result) {
            var sess = req.session;
            sess.guest = true;
            sess.fullname = user.fullname;
            sess.phone = user.phone;
            sess.email = user.email;
            sess.userid = user._id;
            res.redirect("/");
          } else {
            req.flash("errorPassword", "Sai mật khẩu");
            req.flash("errorEmail", errorEmail);
            e++;
          }
        }
      } else {
        req.flash("error", "Tài khoản không tồn tại");
        req.flash("errorEmail", errorEmail);
        e++;
      }
    }
  }
  if (e != 0) {
    res.redirect("/login");
  }
});

//Quên mật khẩu
app.get("/forget", (req, res) => {
  if (req.session.guest) {
    res.redirect("/");
  } else {
    res.render("layouts/clients/password/forget", {
      userid: 1,
      fullname: 1,
      cart: 0,
      error: req.flash("error"),
      errorEmail: req.flash("errorEmail"),
      timeOut: req.flash("timeOut"),
      done: req.flash("done"),
      avatar: "user (2).png",
    });
  }
});

//Gửi yêu cầu cấp lại mã đổi mật khẩu
app.post("/requestPasswordReset", async (req, res) => {
  let errorEmail = req.body.email;
  let email_regex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  let e = 0;
  let timeIn = moment
    .tz(Date.now(), "Asia/Ho_Chi_Minh")
    .format("DD/MM/YYYY hh:mm a");
  let timeOut = moment
    .tz(Date.now(), "Asia/Ho_Chi_Minh")
    .add(15, "minutes")
    .format("DD/MM/YYYY hh:mm a");
  if (errorEmail == "") {
    req.flash("error", "Vui lòng nhập Email!");
    e++;
  } else {
    if (email_regex.test(errorEmail) == false) {
      req.flash("error", "Sai định dạng Email");
      req.flash("errorEmail", errorEmail);
      e++;
    } else {
      const user = await User.findOne({ email: req.body.email });
      if (user) {
        let resetString = makeid(10);
        await Password.deleteMany({ userID: user._id });
        await transporter.sendMail({
          from: "Gaming Shop",
          to: errorEmail,
          subject: "Khôi phục mật khẩu tài khoản website GAMING STORE",
          html: `<p>Nhấn vào <a href=${
            "http://localhost:3000/changePassword/" + user._id
          }>đường dẫn này</a> để khôi phục lại mật khẩu.</p><p>Đường dẫn sẽ <b>hết hạn trong 15 phút!</b></p><p>Mã thay đổi: ${resetString}</p>`,
        });
        const newPasswordReset = new Password({
          userID: user._id,
          resetString: resetString,
          start_date: timeIn,
          end_date: timeOut,
        });
        await newPasswordReset.save();
        res.redirect("/doneRequest");
      } else {
        req.flash("error", "Tài khoản không tồn tại");
        req.flash("errorEmail", errorEmail);
        e++;
      }
    }
  }
  if (e != 0) {
    res.redirect("/forget");
  }
});

//Trang thông báo cấp mã thành công
app.get("/doneRequest", (req, res) => {
  if (req.session.guest) {
    res.redirect("/");
  } else {
    res.render("layouts/clients/password/done", {
      userid: 1,
      fullname: 1,
      cart: 0,
      avatar: "user (2).png",
    });
  }
});

//Trang đổi mật khẩu theo id của người dùng
app.get("/changePassword/:id", async (req, res) => {
  if (req.session.guest) {
    res.redirect("/");
  } else {
    let check = await Password.findOne({ userID: req.params.id });
    let timeNow = moment
      .tz(Date.now(), "Asia/Ho_Chi_Minh")
      .format("DD/MM/YYYY hh:mm a");
    let timeOut = check.end_date;
    let e = 0;
    if (timeNow >= timeOut) {
      e++;
      req.flash("timeOut", "Đường dẫn đã hết hạn!");
    } else {
      res.render("layouts/clients/password/change", {
        userid: 1,
        fullname: 1,
        cart: 0,
        danhsach: check,
        passwordError: req.flash("passwordError"),
        passwordED: req.flash("passwordED"),
        password2ED: req.flash("password2ED"),
        codeError: req.flash("codeError"),
        codeED: req.flash("codeED"),
        avatar: "user (2).png",
      });
    }
    if (e != 0) {
      res.redirect("/forget");
    }
  }
});

//Lưu mật khẩu mới
app.post("/saveNewPassword", async (req, res) => {
  var userid = req.body.userid;
  var code = req.body.code;
  var password = req.body.password;
  var password2 = req.body.password2;
  var vnp_regex =
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/gm;
  let errorForm = 0;

  if (code == "") {
    req.flash("codeError", "Bạn chưa điền mã xác nhận!");
    errorForm++;
  } else {
    let check = await Password.findOne({ resetString: code });
    if (!check) {
      req.flash("codeError", "Mã xác nhận không đúng!");
      errorForm++;
      req.flash("codeED", code);
    } else {
      req.flash("codeED", code);
    }
  }

  if (password == "") {
    req.flash("passwordError", "Bạn chưa đặt mật khẩu!");
    errorForm++;
  }
  if (password != "") {
    if (vnp_regex.test(password) == false) {
      req.flash(
        "passwordError",
        "Mật khẩu tối thiểu tám ký tự, ít nhất một chữ cái, một số và một ký tự đặc biệt!"
      );
      errorForm++;
    } else {
      if (password2 == "") {
        req.flash("passwordError", "Vui lòng xác thực lại mật khẩu!");
        req.flash("passwordED", password);
        errorForm++;
      } else {
        if (password != password2) {
          req.flash("passwordError", "Mật khẩu không trùng khớp");
          req.flash("passwordED", password);
          errorForm++;
        } else {
          await User.updateOne(
            { _id: userid },
            { $set: { password: password } }
          );
          await Password.deleteMany({ userID: userid });
          req.flash("passwordED", "");
          req.flash("codeED", "");
          res.redirect("/success-changepwd");
        }
      }
    }
  }
  if (errorForm != 0) {
    res.redirect("/changePassword/" + userid);
  }
});

//Trang thông báo đổi mật khẩu thành công
app.get("/success-changepwd", (req, res) => {
  if (req.session.guest) {
    req.session.destroy();
    res.render("layouts/clients/password/success_changepwd", {
      fullname: 1,
      userid: 1,
      sID: req.session.sessionID,
      cart: 0,
      avatar: "user (2).png",
    });
  } else {
    res.render("layouts/clients/password/success_changepwd", {
      fullname: 1,
      userid: 1,
      sID: req.session.sessionID,
      cart: 0,
      avatar: "user (2).png",
    });
  }
});

//Đăng xuất
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

//Trang chủ
app.get("/", async (req, res) => {
  if (req.session.guest) {
    const news = await News.find({
      $or: [{ newsStatus: 0 }, { newsStatus: 1 }],
    }).sort({newsStatus:1,updated_date:1});
    const cart = await Cart.aggregate([
      { $match: { userID: new mongoose.Types.ObjectId(req.session.userid) } },
      {
        $addFields: {
          size: {
            $size: "$items",
          },
        },
      },
      {
        $group: {
          _id: null,
          item_count: {
            $sum: "$size",
          },
        },
      },
    ]);
    var sess = req.session;
    sess.cart = cart;
    let user = await User.findOne({ _id: req.session.userid });
    let avatar = "user (2).png";
    if (user.avatar) {
      avatar = user.avatar;
    }
    const data = await Product.aggregate([
      {
        $match: {
          productStatus: { $in: [0, 1] }
        }
      },
      {
        $group: {
          _id: "$productStatus",
          products: { $push: "$$ROOT" }
        }
      },
      {
        $project: {
          products: { $slice: ["$products", 32] }
        }
      },
      {
        $unwind: "$products"
      },
      {
        $replaceRoot: { newRoot: "$products" }
      },
      { $sample: { size: 16 } },
    ]);
    res.render("layouts/clients/home", {
      fullname: req.session.fullname,
      userid: req.session.userid,
      sID: req.session.sessionID,
      danhsach: data,
      VND,
      cart: req.session.cart,
      tintuc: news,
      avatar: avatar,
    });
  } else {
    const news = await News.find({
      $or: [{ newsStatus: 0 }, { newsStatus: 1 }],
    }).sort({newsStatus:1,updated_date:1});
    const data = await Product.aggregate([
      {
        $match: {
          productStatus: { $in: [0, 1] }
        }
      },
      {
        $group: {
          _id: "$productStatus",
          products: { $push: "$$ROOT" }
        }
      },
      {
        $project: {
          products: { $slice: ["$products", 16] }
        }
      },
      {
        $unwind: "$products"
      },
      {
        $replaceRoot: { newRoot: "$products" }
      },
      { $sample: { size: 32 } },
    ]); 
    res.render("layouts/clients/home", {
      fullname: 1,
      userid: 1,
      sID: req.session.sessionID,
      danhsach: data,
      VND,
      cart: 0,
      tintuc: news,
      avatar: "user (2).png",
    });
  }
});

//Trang giới thiệu
app.get("/about", async (req, res) => {
  if (req.session.guest) {
    let user = await User.findOne({ _id: req.session.userid });
    let avatar = "user (2).png";
    if (user.avatar) {
      avatar = user.avatar;
    }
    res.render("layouts/clients/main/about", {
      fullname: req.session.fullname,
      userid: req.session.userid,
      sID: req.session.sessionID,
      cart: req.session.cart,
      avatar: avatar,
    });
  } else {
    res.render("layouts/clients/main/about", {
      fullname: 1,
      userid: 1,
      sID: req.session.sessionID,
      cart: 0,
      avatar: "user (2).png",
    });
  }
});

//Trang chính sách
app.get("/privacy_policy", async (req, res) => {
  if (req.session.guest) {
    let user = await User.findOne({ _id: req.session.userid });
    let avatar = "user (2).png";
    if (user.avatar) {
      avatar = user.avatar;
    }
    res.render("layouts/clients/main/privacy_policy", {
      fullname: req.session.fullname,
      userid: req.session.userid,
      sID: req.session.sessionID,
      cart: req.session.cart,
      avatar: avatar,
    });
  } else {
    res.render("layouts/clients/main/privacy_policy", {
      fullname: 1,
      userid: 1,
      sID: req.session.sessionID,
      cart: 0,
      avatar: "user (2).png",
    });
  }
});

//Trang điều khoản dịch vụ
app.get("/terms_of_service", async (req, res) => {
  if (req.session.guest) {
    let user = await User.findOne({ _id: req.session.userid });
    let avatar = "user (2).png";
    if (user.avatar) {
      avatar = user.avatar;
    }
    res.render("layouts/clients/main/terms_of_service", {
      fullname: req.session.fullname,
      userid: req.session.userid,
      sID: req.session.sessionID,
      cart: req.session.cart,
      avatar: avatar,
    });
  } else {
    res.render("layouts/clients/main/terms_of_service", {
      fullname: 1,
      userid: 1,
      sID: req.session.sessionID,
      cart: 0,
      avatar: "user (2).png",
    });
  }
});

//Trang tổng tin tức
app.get("/news", async (req, res) => {
  let data = await News.find().sort({newsStatus:1,updated_date:1});
  if (req.session.guest) {
    let user = await User.findOne({ _id: req.session.userid });
    let avatar = "user (2).png";
    if (user.avatar) {
      avatar = user.avatar;
    }
    res.render("layouts/clients/news/news", {
      fullname: req.session.fullname,
      userid: req.session.userid,
      sID: req.session.sessionID,
      cart: req.session.cart,
      danhsach: data,
      avatar: avatar,
    });
  } else {
    res.render("layouts/clients/news/news", {
      fullname: 1,
      userid: 1,
      sID: req.session.sessionID,
      cart: 0,
      danhsach: data,
      avatar: "user (2).png",
    });
  }
});

//Trang chi tiết tin tức
app.get("/news/:slug", async (req, res) => {
  let data = await News.find({ slug: req.params.slug });
  if (req.session.guest) {
    let user = await User.findOne({ _id: req.session.userid });
    let avatar = "user (2).png";
    if (user.avatar) {
      avatar = user.avatar;
    }
    res.render("layouts/clients/news/news_detail", {
      fullname: req.session.fullname,
      userid: req.session.userid,
      sID: req.session.sessionID,
      cart: req.session.cart,
      danhsach: data,
      avatar: avatar,
    });
  } else {
    res.render("layouts/clients/news/news_detail", {
      fullname: 1,
      userid: 1,
      sID: req.session.sessionID,
      cart: 0,
      danhsach: data,
      avatar: "user (2).png",
    });
  }
});

//Trang tuyển dụng
app.get("/hiring", async (req, res) => {
  if (req.session.guest) {
    let user = await User.findOne({ _id: req.session.userid });
    let avatar = "user (2).png";
    if (user.avatar) {
      avatar = user.avatar;
    }
    res.render("layouts/clients/main/hiring", {
      fullname: req.session.fullname,
      userid: req.session.userid,
      sID: req.session.sessionID,
      cart: req.session.cart,
      avatar: avatar,
    });
  } else {
    res.render("layouts/clients/main/hiring", {
      fullname: 1,
      userid: 1,
      sID: req.session.sessionID,
      cart: 0,
      avatar: "user (2).png",
    });
  }
});

//Trang hỗ trợ
app.get("/support", async (req, res) => {
  if (req.session.guest) {
    let user = await User.findOne({ _id: req.session.userid });
    let avatar = "user (2).png";
    if (user.avatar) {
      avatar = user.avatar;
    }
    res.render("layouts/clients/main/support", {
      fullname: req.session.fullname,
      userid: req.session.userid,
      sID: req.session.sessionID,
      cart: req.session.cart,
      avatar: avatar,
    });
  } else {
    res.render("layouts/clients/main/support", {
      fullname: 1,
      userid: 1,
      sID: req.session.sessionID,
      cart: 0,
      avatar: "user (2).png",
    });
  }
});

//Trang hotline
app.get("/hotline", async (req, res) => {
  if (req.session.guest) {
    let user = await User.findOne({ _id: req.session.userid });
    let avatar = "user (2).png";
    if (user.avatar) {
      avatar = user.avatar;
    }
    res.render("layouts/clients/main/hotline", {
      fullname: req.session.fullname,
      userid: req.session.userid,
      sID: req.session.sessionID,
      cart: req.session.cart,
      avatar: avatar,
    });
  } else {
    res.render("layouts/clients/main/hotline", {
      fullname: 1,
      userid: 1,
      sID: req.session.sessionID,
      cart: 0,
      avatar: "user (2).png",
    });
  }
});

//Trang CSKH
app.get("/customer_care", async (req, res) => {
  if (req.session.guest) {
    let user = await User.findOne({ _id: req.session.userid });
    let avatar = "user (2).png";
    if (user.avatar) {
      avatar = user.avatar;
    }
    res.render("layouts/clients/main/customer_care", {
      fullname: req.session.fullname,
      userid: req.session.userid,
      sID: req.session.sessionID,
      cart: req.session.cart,
      avatar: avatar,
    });
  } else {
    res.render("layouts/clients/main/customer_care", {
      fullname: 1,
      userid: 1,
      sID: req.session.sessionID,
      cart: 0,
      avatar: "user (2).png",
    });
  }
});

//Trang profile
app.get("/profile/:id", async (req, res) => {
  if (req.session.guest) {
    let user = await User.findOne({ _id: req.session.userid });
    let avatar = "user (2).png";
    if (user.avatar) {
      avatar = user.avatar;
    }
    res.render("layouts/clients/profile", {
      fullname: req.session.fullname,
      email: req.session.email,
      userid: req.session.userid,
      phone: req.session.phone,
      sID: req.session.sessionID,
      cart: req.session.cart,
      avatar: avatar,
    });
  } else {
    res.redirect("/login");
  }
});

//Lưu Avatar
app.post("/saveAvatar", async (req, res) => {
  if (req.session.guest) {
    let userid = req.session.userid;
    avatarUpload(req, res, async function (err) {
      if (err instanceof multer.MulterError) {
        req.flash("error", "Lỗi Multer khi upload ảnh");
      } else if (err) {
        req.flash("error", "Lỗi bất ngờ xảy ra");
      } else {
        await User.updateOne(
          { _id: userid },
          { $set: { avatar: req.file.filename } }
        );
        req.flash("success", "Thêm thành công");
        res.redirect("/profile/" + userid);
      }
    });
  } else {
    res.redirect("/login");
  }
});

//Trang lịch sử đơn hàng
app.get("/orders/:id", async (req, res) => {
  if (req.session.guest) {
    let data = await Order.find({ userID: req.session.userid }).sort({
      orderStatus: 1,
      timeIn: 1,
    });
    let user = await User.findOne({ _id: req.session.userid });
    let avatar = "user (2).png";
    if (user.avatar) {
      avatar = user.avatar;
    }
    res.render("layouts/clients/order/orders", {
      fullname: req.session.fullname,
      email: req.session.email,
      userid: req.session.userid,
      sID: req.session.sessionID,
      cart: req.session.cart,
      danhsach: data,
      VND,
      avatar: avatar,
    });
  } else {
    res.redirect("/login");
  }
});

//Trang cập nhật lại mật khẩu
app.get("/password/:id", async (req, res) => {
  if (req.session.guest) {
    let user = await User.findOne({ _id: req.session.userid });
    let avatar = "user (2).png";
    if (user.avatar) {
      avatar = user.avatar;
    }
    res.render("layouts/clients/password/password", {
      fullname: req.session.fullname,
      email: req.session.email,
      userid: req.session.userid,
      sID: req.session.sessionID,
      cart: req.session.cart,
      passwordError: req.flash("passwordError"),
      password1Error: req.flash("password1Error"),
      passwordED: req.flash("passwordED"),
      password1ED: req.flash("password1ED"),
      avatar: avatar,
    });
  } else {
    res.redirect("/login");
  }
});

//Lưu mật khẩu mới
app.post("/changePasswordNew", async (req, res) => {
  var userid = req.body.userid;
  var password1 = req.body.password1;
  var password = req.body.password;
  var password2 = req.body.password2;
  var vnp_regex =
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/gm;
  let errorForm = 0;

  if (password1 == "") {
    req.flash("password1Error", "Bạn cần nhập mật khẩu cũ!");
    errorForm++;
  }
  if (password1 != "") {
    let check = await User.findOne({ _id: userid });
    let pcheck = check.password;
    if (password1 != pcheck) {
      req.flash("password1Error", "Mật khẩu cũ sai!");
      errorForm++;
    } else {
      req.flash("password1ED", password1);
    }
  }
  if (password == "") {
    req.flash("passwordError", "Bạn chưa đặt mật khẩu!");
    errorForm++;
  }
  if (password != "") {
    if (vnp_regex.test(password) == false) {
      req.flash(
        "passwordError",
        "Mật khẩu tối thiểu tám ký tự, ít nhất một chữ cái, một số và một ký tự đặc biệt!"
      );
      errorForm++;
    } else {
      if (password2 == "") {
        req.flash("passwordError", "Vui lòng xác thực lại mật khẩu!");
        req.flash("passwordED", password);
        errorForm++;
      } else {
        if (password != password2) {
          req.flash("passwordError", "Mật khẩu không trùng khớp");
          req.flash("passwordED", password);
          errorForm++;
        } else {
          await User.updateOne(
            { _id: userid },
            { $set: { password: password } }
          );
          req.flash("passwordED", "");
          req.session.destroy();
          res.redirect("/success-changepwd");
        }
      }
    }
  }
  if (errorForm != 0) {
    res.redirect("/password/" + userid);
  }
});

//Trang chi tiết lịch sử đơn hàng
app.get("/orders_detail/:orderCode", async (req, res) => {
  if (req.session.guest) {
    let user = await User.findOne({ _id: req.session.userid });
    let limit  = user.limit;
    let avatar = "user (2).png";
    if (user.avatar) {
      avatar = user.avatar;
    }
    let data = await Order.findOne({ orderCode: req.params.orderCode }).populate(
      "items.productID"
    );
    let code = data.couponCode;
    if (code == "Không") {
      let money = 0;
      let couponValue = 0;
      let couponType = 0;
      data.items.forEach(function (pid) {
        money += pid.productID.priceOut * pid.quantity;
      });
      res.render("layouts/clients/order/orders_detail", {
        fullname: req.session.fullname,
        email: req.session.email,
        userid: req.session.userid,
        sID: req.session.sessionID,
        cart: req.session.cart,
        danhsach: data,
        VND,
        money,
        couponValue,
        couponType,
        avatar: avatar,
        formError: req.flash("formError"),
        limit,
      });
    } else if (code != "Không") {
      let coupon = await Coupon.findOne({ couponCode: code });
      let couponValue = coupon.couponValue;
      let couponType = coupon.couponType;
      let money = 0;
      data.items.forEach(function (pid) {
        money += pid.productID.priceOut * pid.quantity;
      });

      res.render("layouts/clients/order/orders_detail", {
        fullname: req.session.fullname,
        email: req.session.email,
        userid: req.session.userid,
        sID: req.session.sessionID,
        cart: req.session.cart,
        danhsach: data,
        VND,
        money,
        couponValue,
        couponType,
        avatar: avatar,
        formError: req.flash("formError"),
        limit,
      });
    }
  } else {
    res.redirect("/login");
  }
});

//Trang giỏ hàng và thanh toán và trang thông báo đặt hàng thành công
app.get("/cart/:id", async (req, res) => {
  if (req.session.guest) {
    let user = await User.findOne({ _id: req.session.userid });
    let avatar = "user (2).png";
    if (user.avatar) {
      avatar = user.avatar;
    }
    const cart = await Cart.aggregate([
      { $match: { userID: new mongoose.Types.ObjectId(req.session.userid) } },
      {
        $addFields: {
          size: {
            $size: "$items",
          },
        },
      },
      {
        $group: {
          _id: null,
          item_count: {
            $sum: "$size",
          },
        },
      },
    ]);
    var sess = req.session;
    sess.cart = cart;
    const carti = await Cart.find({
      userID: new mongoose.Types.ObjectId(req.session.userid),
    });
    let data = await Cart.find({
      userID: new mongoose.Types.ObjectId(req.session.userid),
    }).populate("items.productID");
    let money = 0;
    for (let i = 0; i < data.length; i++) {
      data[i].items.forEach(function (pid) {
        money += pid.productID.priceOut * parseInt(pid.quantity);
      });
    }
    res.render("layouts/clients/cart/cart", {
      fullname: req.session.fullname,
      userid: req.session.userid,
      sID: req.session.sessionID,
      danhsach: data,
      VND,
      cart: req.session.cart,
      carti,
      money,
      avatar: avatar,
    });
  } else {
    res.redirect("/login");
  }
});

//Thêm sản phẩm vào giỏ hàng
app.post("/add_to_cart", async (req, res) => {
  if (req.session.guest) {
    const productId = req.body.product_id_hidden;
    const quantity = parseInt(req.body.quantity);
    const convert = req.body.quantity;
    const uid = req.body.user_id_hidden;
    const qty = await Product.findOne({ _id: productId });
    const slug = qty.slug;
    let cartE = await Cart.find({ userID: req.body.user_id_hidden });
    if (cartE[0]) {
      const isE = cartE[0].items.findIndex((item) => {
        return (
          new String(item.productID).trim() == new String(productId).trim()
        );
      });
      if (isE == -1) {
        await Cart.updateOne(
          { userID: uid },
          {
            $addToSet: {
              items: {
                _id: productId,
                productID: productId,
                quantity: quantity,
              },
            },
          }
        );
        req.flash("add", "Thêm vào giỏ thành công");
      } else {
        if (cartE[0].items[isE].quantity == qty.productQuantity) {
          req.flash("error", "Số lượng của sản phẩm trong giỏ đã đầy");
        } else if (
          quantity + cartE[0].items[isE].quantity >
          qty.productQuantity
        ) {
          await Cart.updateOne(
            {
              userID: uid,
              items: { $elemMatch: { _id: productId } },
            },
            { $set: { "items.$.quantity": qty.productQuantity } }
          );
          req.flash("error", "Số lượng của sản phẩm trong giỏ đã đầy");
        } else {
          await Cart.updateOne(
            {
              userID: uid,
              items: { $elemMatch: { _id: productId } },
            },
            { $inc: { "items.$.quantity": convert } }
          );
          req.flash("add", "Thêm vào giỏ thành công");
        }
      }
      res.redirect("/product/" + slug);
    } else {
      var cartData = Cart({
        _id: uid,
        items: [
          {
            quantity: quantity,
            productID: productId,
            _id: productId,
          },
        ],
        userID: uid,
      });
      await cartData.save();
      req.flash("add", "Thêm vào giỏ thành công");
      res.redirect("/product/" + slug);
    }
  } else {
    res.redirect("/login");
  }
});

//Cập nhật số lượng sản phẩm trong giỏ hàng
app.post("/update_quantity_cart", async (req, res) => {
  if (req.session.guest) {
    const uid = req.session.userid;
    var productId = req.body.product_id_hidden;
    var quantity = req.body.quantity;
    const data = collect(productId);
    const total = data.count();
    if (total == 1) {
      if(quantity > 0){
        await Cart.updateOne(
          {
            userID: uid,
            items: { $elemMatch: { _id: productId } },
          },
          { "items.$.quantity": quantity }
        );
      } else {
        await Cart.deleteOne({
          userID: new mongoose.Types.ObjectId(uid),
        });
      }
    } else {
      let allQuantitiesAreZero = true;
      for (let i = 0; i < productId.length; i++) {
        if(quantity[i]>0){
          allQuantitiesAreZero = false;
        await Cart.updateOne(
          {
            userID: uid,
            items: { $elemMatch: { _id: productId[i] } },
          },
          { "items.$.quantity": quantity[i] }
        );
        } else {
          await Cart.updateOne(
            {
              userID: uid,
              items: { $elemMatch: { _id: productId[i] } },
            },
            { $pull: { items: { _id: productId[i] } } },
            { multi: true }
          );
        }
      }
      if (allQuantitiesAreZero) {
        await Cart.deleteOne({ userID: uid });
      }
    }
    res.redirect("/cart/" + uid);
  } else {
    res.redirect("/login");
  }
});

//Xoá sản phẩm khỏi giỏ hàng
app.get("/delete_cart_items/:id", async (req, res) => {
  if (req.session.guest) {
    const uid = req.session.userid;
    const productId = req.params.id;
    const cart = await Cart.aggregate([
      { $match: { userID: new mongoose.Types.ObjectId(req.session.userid) } },
      {
        $addFields: {
          size: {
            $size: "$items",
          },
        },
      },
      {
        $group: {
          _id: null,
          item_count: {
            $sum: "$size",
          },
        },
      },
    ]);
    cart.forEach(async function (item) {
      if (item.item_count == 1) {
        await Cart.deleteOne({
          userID: new mongoose.Types.ObjectId(req.session.userid),
        }).then(function () {
          res.redirect("/cart/" + uid);
        });
      } else {
        await Cart.updateOne(
          {
            "items._id": productId,
            userID: uid,
          },
          { $pull: { items: { _id: productId } } },
          { multi: true }
        ).then(function () {
          res.redirect("/cart/" + uid);
        });
      }
    });
  } else {
    res.redirect("/login");
  }
});

//Trang thanh toán
app.get("/checkout/:id", async (req, res) => {
  if (req.session.guest) {
    let user = await User.findOne({ _id: req.session.userid });
    let avatar = "user (2).png";
    if (user.avatar) {
      avatar = user.avatar;
    }
    let carti = await Cart.find({
      userID: new mongoose.Types.ObjectId(req.session.userid),
    });
    let address = await City.find();
    await Cart.find({
      userID: new mongoose.Types.ObjectId(req.session.userid),
    })
      .populate("items.productID")
      .then((data) => {
        let money = 0;
        for (let i = 0; i < data.length; i++) {
          data[i].items.forEach(function (pid) {
            money += pid.productID.priceOut * parseInt(pid.quantity);
          });
        }
        let convert = parseInt(money);
        res.render("layouts/clients/cart/checkout", {
          fullname: req.session.fullname,
          phone: req.session.phone,
          email: req.session.email,
          userid: req.session.userid,
          sID: req.session.sessionID,
          cart: req.session.cart,
          carti,
          danhsach: data,
          VND,
          city: address,
          convert,
          success: req.flash("success"),
          error: req.flash("error"),
          cash: req.flash("cash"),
          blunt: req.flash("blunt"),
          percent: req.flash("percent"),
          code: req.flash("code"),
          type: req.flash("type"),
          nameError: req.flash("nameError"),
          cityError: req.flash("cityError"),
          districtError: req.flash("districtError"),
          wardError: req.flash("wardError"),
          addressError: req.flash("addressError"),
          mobileError: req.flash("mobileError"),
          methodError: req.flash("methodError"),
          mobileED: req.flash("mobileED"),
          nameED: req.flash("nameED"),
          addressED: req.flash("addressED"),
          noteED: req.flash("noteED"),
          avatar: avatar,
        });
      });
  } else {
    res.redirect("/login");
  }
});

//Thêm mã giảm giá vào lúc thanh toán
app.post("/add_coupon_checkout", async (req, res) => {
  if (req.session.guest) {
    let uid = req.session.userid;
    let check = await Coupon.findOne({ couponCode: req.body.couponCode });

    var name = req.body.shippingName;
    var address = req.body.shippingAddress;
    var mobile = req.body.shippingPhone;
    var note = req.body.shippingNote;

    if (name != "") {
      let nameED = name;
      req.flash("nameED", nameED);
    }
    if (mobile != "") {
      let mobileED = mobile;
      req.flash("mobileED", mobileED);
    }
    if (address != "") {
      let addressED = address;
      req.flash("addressED", addressED);
    }
    if (note != "") {
      let noteED = note;
      req.flash("noteED", noteED);
    }

    if (check) {
      let uid = req.session.userid;
      let userCheck = await Coupon.findOne({
        $and: [{ couponCode: req.body.couponCode }, { userID: uid }],
      });
      if (userCheck) {
        req.flash(
          "error",
          "Mã giảm giá đã được sử dụng trong tài khoản của bạn"
        );
      } else {
        let time = moment
          .tz(Date.now(), "Asia/Ho_Chi_Minh")
          .format("DD/MM/YYYY");
        let timeStart = check.start_date;
        let timeEnd = check.end_date;
        if (time < timeStart) {
          req.flash("error", "Thêm mã giảm giá không thành công");
        } else if (time > timeEnd) {
          req.flash("error", "Thêm mã giảm giá không thành công");
        } else {
          if (check.couponQuantity == 0) {
            req.flash("error", "Thêm mã giảm giá không thành công");
          } else {
            if (check.couponType == 0) {
              req.flash("cash", "- " + VND.format(check.couponValue * 1000));
              req.flash("blunt", check.couponValue * 1000);
              req.flash("percent", 0);
              req.flash("code", check.couponCode);
            } else if (check.couponType == 1) {
              req.flash("cash", "- " + check.couponValue + "%");
              req.flash("blunt", 0);
              req.flash("percent", check.couponValue * 0.01);
              req.flash("code", check.couponCode);
            }
            req.flash("success", "Thêm mã giảm giá thành công");
          }
        }
      }
    } else {
      req.flash("error", "Thêm mã giảm giá không thành công");
    }
    res.redirect("/checkout/" + uid);
  } else {
    res.redirect("/login");
  }
});

//Tạo đơn hàng mới 
app.post("/creat_new_order", async (req, res) => {
  const productName = req.body.product_name_hidden;
  const productId = req.body.product_id_hidden;
  const quantity = req.body.quantity_hidden;
  const uid = req.body.user_id_hidden;
  const code = req.body.couponCode;
  var orderCode = await generateOrderCode();

  let errorForm = 0;

  var name = req.body.shippingName;
  var city = req.body.shippingCity;
  var district = req.body.shippingDistrict;
  var ward = req.body.shippingWard;
  var address = req.body.shippingAddress;
  var mobile = req.body.shippingPhone;
  var note = req.body.shippingNote;
  var method = req.body.paymentMethod;

  var vnn_regex =
    /^[a-zA-Z'-'\saAàÀảẢãÃáÁạẠăĂằẰẳẲẵẴắẮặẶâÂầẦẩẨẫẪấẤậẬbBcCdDđĐeEèÈẻẺẽẼéÉẹẸêÊềỀểỂễỄếẾệỆfFgGhHiIìÌỉỈĩĨíÍịỊjJkKlLmMnNoOòÒỏỎõÕóÓọỌôÔồỒổỔỗỖốỐộỘơƠờỜởỞỡỠớỚợỢpPqQrRsStTuUùÙủỦũŨúÚụỤưƯừỪửỬữỮứỨựỰvVwWxXyYỳỲỷỶỹỸýÝỵỴzZ]*$/g;
  var vnf_regex = /((09|03|07|08|05)+([0-9]{8})\b)/g;

  if (name == "") {
    req.flash("nameError", "Bạn chưa điền họ và tên người nhận!");
    errorForm++;
  }
  if (city == "") {
    req.flash("cityError", "Bạn chưa chọn tỉnh thành!");
    errorForm++;
  }
  if (district == "") {
    req.flash("districtError", "Bạn chưa chọn quận huyện!");
    errorForm++;
  }
  if (ward == "") {
    req.flash("wardError", "Bạn chưa chọn phường xã!");
    errorForm++;
  }
  if (address == "") {
    req.flash("addressError", "Bạn chưa điền địa chỉ!");
    errorForm++;
  }
  if (mobile == "") {
    req.flash("mobileError", "Bạn chưa điền số điện thoại!");
    errorForm++;
  }
  if (mobile != "") {
    if (vnf_regex.test(mobile) == false) {
      req.flash("mobileError", "Số điện thoại của bạn không đúng định dạng!");
      let mobileED = mobile;
      req.flash("mobileED", mobileED);
      errorForm++;
    } else {
      let mobileED = mobile;
      req.flash("mobileED", mobileED);
    }
  }
  if (name != "") {
    if (vnn_regex.test(name) == false) {
      req.flash("nameError", "Họ và tên của bạn không đúng định dạng!");
      let nameED = name;
      req.flash("nameED", nameED);
      errorForm++;
    } else {
      let nameED = name;
      req.flash("nameED", nameED);
    }
  }
  if (address != "") {
    let addressED = address;
    req.flash("addressED", addressED);
  }
  if (note != "") {
    let noteED = note;
    req.flash("noteED", noteED);
  }

  if (errorForm != 0) {
    res.redirect("/checkout/" + uid);
  } else {
    const data = collect(productId);
    const total = data.count();
    if (total == 1) {
      await Order.insertMany({
        orderCode: orderCode,
        items: [
          {
            quantity: quantity,
            productID: productId,
            _id: productId,
          },
        ],
        userID: uid,
        paymentMethod: method,
        shippingAddress: address,
        shippingFee: req.body.shippingFee,
        shippingName: name,
        shippingCity: city,
        shippingDistrict: district,
        shippingWard: ward,
        shippingNote: req.body.shippingNote,
        shippingPhone: mobile,
        total: req.body.total,
        couponCode: code,
        day: moment
        .tz(Date.now(), "Asia/Ho_Chi_Minh")
        .format("DD/MM/YYYY"),
        timeIn: moment
          .tz(Date.now(), "Asia/Ho_Chi_Minh")
          .format("DD/MM/YYYY hh:mm a"),
        orderStatus: 0,
      });
      let time = moment
      .tz(Date.now(), "Asia/Ho_Chi_Minh")
      .format("DD/MM/YYYY hh:mm a");
      await Coupon.updateOne(
        { couponCode: code },
        { $inc: { couponQuantity: -1 }, $addToSet: { userID: uid } }
      );
      await Product.updateOne(
        { _id: productId },
        { $inc: { productQuantity: -quantity } }
      );
      await Cart.deleteOne({
        userID: new mongoose.Types.ObjectId(req.session.userid),
      });
      await transporter.sendMail({
        from: "Gaming Shop",
        to: req.session.email,
        subject: "Đặt hàng thành công",
        html: `
        <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <img src="https://github.com/lam3531/vietnam/blob/main/gamingstore-logoo.png?raw=true" alt="Logo" style="display: block; margin: 0 auto; max-width: 30%;">
        <h1 style="color: #333333; text-align: center; margin-bottom: 20px; font-size: 24px;">Đặt hàng thành công</h1>
        <p style="color: #555555; font-size: 16px; margin-bottom: 10px; text-align: center;">Cảm ơn bạn đã đặt hàng tại cửa hàng của chúng tôi.</p>
        <p style="color: #555555; font-size: 16px; margin-bottom: 15px; text-align: center;">
          Bạn có thể theo dõi thông tin đơn hàng tại chi tiết đơn hàng của bạn:
        </p>
        <div style="background-color: #ffffff; border-radius: 5px; padding: 20px;">
          <p style="color: #333333; font-size: 16px; margin-bottom: 15px;">
            <strong>Chi tiết đơn hàng:</strong>
          </p>
          <p>
            <span style="font-weight: bold;">Mã đơn hàng:</span> ${orderCode}
          </p>
          <p style="font-weight: bold;">Thời gian đặt: ${time}</p>
          <p style="font-size: 14px; margin-bottom: 15px;">
            <span style="font-weight: bold;">Sản phẩm:</span> ${productName}<br>
            <span style="font-weight: bold;">Số lượng:</span> ${quantity}
          </p>
          <p style="font-size: 14px; margin-bottom: 15px;">
            <span style="font-weight: bold;">Tổng giá sản phẩm:</span> ${VND.format(req.body.provisional)}
          </p>
          <p style="font-size: 14px; margin-bottom: 15px;">
            <span style="font-weight: bold;">Phí vận chuyển:</span> ${VND.format(req.body.shippingFee)}
          </p>
          <p style="font-size: 14px; margin-bottom: 15px;">
            <span style="font-weight: bold;">Mã khuyến mại:</span> ${req.body.couponCode}
          </p>
          <p style="font-size: 14px; margin-bottom: 15px;">
            <span style="font-weight: bold;">Tổng:</span> ${VND.format(req.body.total)}
          </p>
          <p style="font-size: 14px; margin-bottom: 0;">
            <span style="font-weight: bold;">Hình thức thanh toán:</span> ${method}
          </p>
        </div>
        <p style="font-size: 16px; margin-top: 20px; text-align: center;">
          Xin cảm ơn bạn đã mua hàng tại cửa hàng chúng tôi!
        </p>
      </div>
        `,
      });
    } else {
      let obj = productId.map((id, index_value) => {
        return {
          _id: id,
          productID: id,
          quantity: quantity[index_value],
        };
      });
      let time = moment
      .tz(Date.now(), "Asia/Ho_Chi_Minh")
      .format("DD/MM/YYYY hh:mm a");
      await Order.insertMany({
        orderCode: orderCode,
        items: obj,
        userID: uid,
        paymentMethod: method,
        shippingAddress: address,
        shippingFee: req.body.shippingFee,
        shippingName: name,
        shippingCity: city,
        shippingDistrict: district,
        shippingWard: ward,
        shippingNote: req.body.shippingNote,
        shippingPhone: mobile,
        total: req.body.total,
        couponCode: code,
        day: moment
        .tz(Date.now(), "Asia/Ho_Chi_Minh")
        .format("DD/MM/YYYY"),
        timeIn: moment
          .tz(Date.now(), "Asia/Ho_Chi_Minh")
          .format("DD/MM/YYYY hh:mm a"),
        orderStatus: 0,
      });
      for (let i = 0; i < productId.length; i++) {
        await Product.updateMany(
          { _id: productId[i] },
          { $inc: { productQuantity: -quantity[i] } }
        );
      }
      await Coupon.updateOne(
        { couponCode: code },
        { $inc: { couponQuantity: -1 }, $addToSet: { userID: uid } }
      );
      await Cart.deleteOne({
        userID: new mongoose.Types.ObjectId(req.session.userid),
      });
      const emailData = {
        from: "Gaming Shop",
        to: req.session.email,
        subject: "Đặt hàng thành công",
        html: `<div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <img src="https://github.com/lam3531/vietnam/blob/main/gamingstore-logoo.png?raw=true" alt="Logo" style="display: block; margin: 0 auto; max-width: 30%;">
        <h1 style="color: #333333; text-align: center; margin-bottom: 20px; font-size: 24px;">Đặt hàng thành công</h1>
        <p style="color: #333333; font-size: 18px; margin-bottom: 10px; text-align: center;">Cảm ơn bạn đã đặt hàng tại cửa hàng của chúng tôi.</p>
        <p style="color: #333333; font-size: 16px; margin-bottom: 15px; text-align: center;">Bạn có thể theo dõi thông tin đơn hàng tại chi tiết đơn hàng của bạn.</p>
        <p style="color: #555555; font-size: 16px; margin-bottom: 10px; font-weight: bold;">Chi tiết đơn hàng:</p>
        <p style="font-weight: bold;">Mã đơn hàng: ${orderCode}</p>
        <p style="font-weight: bold;">Thời gian đặt: ${time}</p>
        ${productId.map(
          (productId, index) => `
          <p style="font-size: 14px; margin-bottom: 5px;">
            <span style="font-weight: bold;">Sản phẩm:</span> ${productName[index]},&nbsp;
            <span style="font-weight: bold;">số lượng:</span> ${quantity[index]}
          </p>`
        ).join("")}
        <p style="font-size: 16px; margin-bottom: 10px;">
          <span style="font-weight: bold;">Tổng giá sản phẩm:</span> ${VND.format(req.body.provisional)}
        </p>
        <p style="font-size: 16px; margin-bottom: 10px;">
          <span style="font-weight: bold;">Phí vận chuyển:</span> ${VND.format(req.body.shippingFee)}
        </p>
        <p style="font-size: 16px; margin-bottom: 10px;">
          <span style="font-weight: bold;">Mã khuyến mại:</span> ${req.body.couponCode}
        </p>
        <p style="font-size: 16px; margin-bottom: 10px;">
          <span style="font-weight: bold;">Tổng:</span> ${VND.format(req.body.total)}
        </p>
        <p style="font-size: 16px; margin-bottom: 0;">
          <span style="font-weight: bold;">Hình thức thanh toán:</span> ${method}
        </p>
        <p style="margin-top: 20px; text-align: center;">
          Xin cảm ơn bạn đã mua hàng tại cửa hàng chúng tôi!
        </p>
      </div>
      `,
      };
      await transporter.sendMail(emailData);
    }
    res.redirect("/success");
  }
});

//Đặt hàng thành công
app.get("/success", async (req, res) => {
  if (req.session.guest) {
    const cart = await Cart.aggregate([
      { $match: { userID: new mongoose.Types.ObjectId(req.session.userid) } },
      {
        $addFields: {
          size: {
            $size: "$items",
          },
        },
      },
      {
        $group: {
          _id: null,
          item_count: {
            $sum: "$size",
          },
        },
      },
    ]);
    var sess = req.session;
    sess.cart = cart;
    let user = await User.findOne({ _id: req.session.userid });
    let avatar = "user (2).png";
    if (user.avatar) {
      avatar = user.avatar;
    }
    res.render("layouts/clients/cart/success", {
      fullname: req.session.fullname,
      userid: req.session.userid,
      sID: req.session.sessionID,
      cart: req.session.cart,
      avatar: avatar,
    });
  } else {
    res.redirect("/login");
  }
});

//Nhận hàng
app.post("/get_order/:orderCode", async (req, res) => {
  if (req.session.guest) {
    let uid = req.session.userid;
    await Order.updateOne(
      { orderCode: req.params.orderCode },
      {
        $set: {
          orderStatus: 3,
          timeOut: moment
            .tz(Date.now(), "Asia/Ho_Chi_Minh")
            .format("DD/MM/YYYY hh:mm a"),
          time: moment.tz(Date.now(), "Asia/Ho_Chi_Minh").format("DD/MM/YYYY"),
          month: moment.tz(Date.now(), "Asia/Ho_Chi_Minh").month(),
        },
      }
    );
    let data = await Order.findOne({ orderCode: req.params.orderCode });
    let array = [];
    data.items.forEach(function (id) {
      array.push(id.productID);
    });
    let length = array.length;
    if (length == 1) {
      await Product.updateOne({ _id: array }, { $addToSet: { userID: uid } });
    } else {
      for (let i = 0; i < array.length; i++) {
        await Product.updateMany(
          { _id: array[i] },
          { $addToSet: { userID: uid } }
        );
      }
    }
    res.redirect("/orders/" + uid);
  } else {
    res.redirect("/login");
  }
});

//Huỷ đơn hàng
app.post("/cancel_order/:orderCode", async (req, res) => {
  if (req.session.guest) {
    let uid = req.session.userid;
    let user = await User.findOne({_id:uid});
    let limit = user.limit;
    let order = req.params.orderCode;
    let check = await Order.findOne({orderCode: req.params.orderCode});
    if(check.orderStatus != 0){
      res.redirect("/orders_detail/" + order);
    } else if(limit == 0){
      res.redirect("/orders_detail/" + order);
    } else {
      let check = req.body.cancelReason;
      if(check == ""){
        req.flash("formError", "Bạn chưa điền lý do huỷ đơn hàng!");
        res.redirect("/orders_detail/" + order);
      } else {
        await Order.updateOne(
          { orderCode: req.params.orderCode },
          {
            $set: {
              orderStatus: 4,
              cancelReason: req.body.cancelReason,
              cancelFrom: "Khách",
              timeOut: moment
                .tz(Date.now(), "Asia/Ho_Chi_Minh")
                .format("DD/MM/YYYY hh:mm a"),
            },
          }
        );
        if (limit > 0) {
          await User.updateOne({_id:uid},{$inc:{limit:-1}});
        }
        let data = await Order.findOne({ orderCode: req.params.orderCode });
        if (data.items.length == 1) {
          data.items.forEach(async function (id) {
            let qty = id.quantity;
            let pid = id._id;
            await Product.updateOne(
              { _id: pid },
              { $inc: { productQuantity: qty } }
            );
          });
        } else if (data.items.length > 1) {
          let arrayQ = [];
          let arrayP = [];
          data.items.forEach(async function (id) {
            let qty = id.quantity;
            let pid = id._id;
            arrayQ.push(qty);
            arrayP.push(pid);
          });
          for (let i = 0; i < arrayP.length; i++) {
            await Product.updateMany(
              { _id: arrayP[i] },
              { $inc: { productQuantity: arrayQ[i] } }
            );
          }
        }
        res.redirect("/orders_detail/" + order);
      }
    }
  } else {
    res.redirect("/login");
  }
});

//Hàm cập nhật số lần huỷ đơn hàng của trong 1 tháng của khách hàng
cron.schedule('0 0 1 * *', async () => {
  await User.updateMany({}, { $set: { limit: 2 } });
});

//Trang tìm kiếm
app.get("/search", async (req, res) => {
  let kw = req.query.kw.trim();
  let data = [];
  if (req.session.guest) {
    if(kw==""){
      data = [];
    } else {
      let find = await Product.find({
        productName: { $regex: ".*" + kw + ".*", $options: "i" },
      })
      .populate("producerID")
      .populate("categoryID")
      .sort({productName:1});
      data = find.map(({ productImage, productName, slug, priceOut, producerID, categoryID }) => {
        let categoryNames = categoryID.map(({ categoryName }) => categoryName);
        let categoryNameString = categoryNames.join(", ");
        return { productImage, productName, slug, priceOut, producerName: producerID.producerName, categoryName: categoryNameString };
      });
    }
    let user = await User.findOne({ _id: req.session.userid });
    let avatar = "user (2).png";
    if (user.avatar) {
      avatar = user.avatar;
    }
    res.render("layouts/clients/main/search", {
      fullname: req.session.fullname,
      userid: req.session.userid,
      sID: req.session.sessionID,
      danhsach: data,
      VND,
      cart: req.session.cart,
      avatar: avatar,
      kw,
    });
  } else {
    if(kw==""){
      data = [];
    } else {
      let find = await Product.find({
        productName: { $regex: ".*" + kw + ".*", $options: "i" },
      })
      .populate("producerID")
      .populate("categoryID")
      .sort({productName:1});
      data = find.map(({ productImage, productName, slug, priceOut, producerID, categoryID }) => {
        let categoryNames = categoryID.map(({ categoryName }) => categoryName);
        let categoryNameString = categoryNames.join(", ");
        return { productImage, productName, slug, priceOut, producerName: producerID.producerName, categoryName: categoryNameString };
      });
    }
    res.render("layouts/clients/main/search", {
      fullname: 1,
      userid: 1,
      sID: req.session.sessionID,
      danhsach: data,
      VND,
      cart: 0,
      avatar: "user (2).png",
      kw,
    });
  }
});

//Trang test
app.get("/test", async (req, res) => {
  let data = await Product.find({
    $or: [{ productStatus: 0 }, { productStatus: 1 }],
  }).sort({productName:1}).select('-_id productName priceOut slug productImage');

  async function getBestSalesByMonth() {
    let bestSalesByMonth = await Order.aggregate([
      { $match: { orderStatus: 3 } },
      {
        $project: {
          month: { $toInt: "$month" },
          items: 1,
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: { month: "$month", productID: "$items._id" },
          totalCount: { $sum: "$items.quantity" },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id.productID",
          foreignField: "_id",
          as: "productList",
        },
      },
      {
        $project: {
          month: "$_id.month",
          product: { $arrayElemAt: ["$productList", 0] },
          totalCount: 1,
        },
      },
      { $sort: { month: 1 } },
      {
        $group: {
          _id: "$month",
          bestSales: {
            $push: {
              product: "$product",
              totalCount: "$totalCount",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          month: "$_id",
          bestSales: { $slice: ["$bestSales", 5] },
        },
      },
    ]);
  
    return bestSalesByMonth;
  }
  getBestSalesByMonth().then((result) => {
    let monthsData = result.reduce((acc, cur) => {
      let month = cur.month;
      let bestSales = cur.bestSales.slice(0, 5);
      if (!acc[month]) {
        acc[month] = {
          month: month,
          sales: [],
        };
      }
      for (let j = 0; j < bestSales.length; j++) {
        acc[month].sales.push({
          productName: bestSales[j].product.productName,
          totalCount: bestSales[j].totalCount,
        });
      }
      return acc;
    }, {});
    let a = Object.values(monthsData);
  }).catch((error) => {
    console.log(error);
    throw error;
  });

  res.render("layouts/clients/main/test", {
    fullname: 1,
    userid: 1,
    sID: req.session.sessionID,
    data,
    VND,
    cart: 0,
    avatar: "user (2).png",
  });
});

//Trang tất cả các sản phẩm
app.get("/all_product", async (req, res) => {
  if (req.session.guest) {
    let user = await User.findOne({ _id: req.session.userid });
    let avatar = "user (2).png";
    if (user.avatar) {
      avatar = user.avatar;
    }
    let data = await Product.find({
      $or: [{ productStatus: 0 }, { productStatus: 1 }],
    }).sort({productName:1}).select('-_id productName priceOut slug productImage');
    res.render("layouts/clients/main/all_product", {
      fullname: req.session.fullname,
      userid: req.session.userid,
      sID: req.session.sessionID,
      data,
      VND,
      cart: req.session.cart,
      avatar: avatar,
    });
  } else {
    let data = await Product.find({
      $or: [{ productStatus: 0 }, { productStatus: 1 }],
    }).sort({productName:1}).select('-_id productName priceOut slug productImage');
    res.render("layouts/clients/main/all_product", {
      fullname: 1,
      userid: 1,
      sID: req.session.sessionID,
      data,
      VND,
      cart: 0,
      avatar: "user (2).png",
    });
  }
});

//Trang chi tiết sản phẩm
app.get("/product/:slug", async (req, res) => {
  if (req.session.guest) {
    const cart = await Cart.aggregate([
      { $match: { userID: new mongoose.Types.ObjectId(req.session.userid) } },
      {
        $addFields: {
          size: {
            $size: "$items",
          },
        },
      },
      {
        $group: {
          _id: null,
          item_count: {
            $sum: "$size",
          },
        },
      },
    ]);
    var sess = req.session;
    sess.cart = cart;
    let product = await Product.findOne({ slug: req.params.slug });
    let productID = product._id;
    let comments = await Comment.find({
      productID: new mongoose.Types.ObjectId(productID),
    }).populate("userID");
    let pname = product.productName;
    let data = await Product.findOne({ slug: req.params.slug })
      .populate("categoryID")
      .populate("producerID");
    let check = await Product.findOne({
      $and: [{ slug: req.params.slug }, { userID: req.session.userid }],
    });
    let random = 0;
    if (check) {
      random++;
    }
    let user = await User.findOne({ _id: req.session.userid });
    let avatar = "user (2).png";
    if (user.avatar) {
      avatar = user.avatar;
    }
    res.render("layouts/clients/main/product", {
      fullname: req.session.fullname,
      userid: req.session.userid,
      sID: req.session.sessionID,
      danhsach: data,
      cart: req.session.cart,
      VND,
      pname,
      comments,
      add: req.flash("add"),
      random,
      avatar: avatar,
      success: req.flash("success"),
      error: req.flash("error"),
    });
  } else {
    let product = await Product.findOne({ slug: req.params.slug });
    let productID = product._id;
    let comments = await Comment.find({
      productID: new mongoose.Types.ObjectId(productID),
    }).populate("userID");
    let pname = product.productName;
    let data = await Product.findOne({ slug: req.params.slug })
      .populate("categoryID")
      .populate("producerID");
    res.render("layouts/clients/main/product", {
      fullname: 1,
      userid: 1,
      sID: req.session.sessionID,
      danhsach: data,
      VND,
      cart: 0,
      pname,
      random: 0,
      comments,
      add: req.flash("add"),
      avatar: "user (2).png",
      success: req.flash("success"),
      error: req.flash("error"),
    });
  }
});

//Bình luận sản phẩm
app.post("/comment", async (req, res) => {
  if (req.session.guest) {
    let pid = req.body.productID;
    let uid = req.body.userID;
    var product = await Product.findOne({_id: pid});
    var slug = product.slug;
    let check = await Product.find({ $and: [{ _id: pid }, { userID: uid }] });
    if (check) {
      var comment = Comment({
        productID: pid,
        userID: uid,
        commentInfo: req.body.commentInfo,
        commentStatus: 1,
        commentDate: moment
          .tz(Date.now(), "Asia/Ho_Chi_Minh")
          .format("DD/MM/YYYY hh:mm a"),
      });
      comment.save();
      req.flash("success", "Bình luận thành công!");
      res.redirect("/product/" + slug);
    } else {
      res.redirect("/product/" + slug);
    }
  } else {
    res.redirect("/login");
  }
});

//Trang danh mục theo NSX
app.get("/producer/:slug", async (req, res) => {
  if (req.session.guest) {
    let user = await User.findOne({ _id: req.session.userid });
    let avatar = "user (2).png";
    if (user.avatar) {
      avatar = user.avatar;
    }
    const producer = await Producer.findOne({slug: req.params.slug});
    const producerId = producer._id;
    let data = await Product.find({
      producerID: new mongoose.Types.ObjectId(producerId),
    }).sort({productName:1}).select('-_id productName priceOut slug productImage');
    let title = producer.producerName;
    let id = producer.slug;

    res.render("layouts/clients/producer/producer", {
      fullname: req.session.fullname,
      userid: req.session.userid,
      sID: req.session.sessionID,
      cart: req.session.cart,
      data,
      VND,
      title,
      id,
      avatar: avatar,
    });
  } else {
    const producer = await Producer.findOne({slug: req.params.slug});
    const producerId = producer._id;

    let data = await Product.find({
      producerID: new mongoose.Types.ObjectId(producerId),
    }).sort({productName:1}).select('-_id productName priceOut slug productImage');

    let title = producer.producerName;
    let id = producer.slug;
    res.render("layouts/clients/producer/producer", {
      fullname: 1,
      userid: 1,
      sID: req.session.sessionID,
      cart: 0,
      data,
      VND,
      title,
      id,
      avatar: "user (2).png",
    });
  }
});

//Trang category
app.get("/category/:slug", async (req, res) => {
  if (req.session.guest) {
    let user = await User.findOne({ _id: req.session.userid });
    let avatar = "user (2).png";
    if (user.avatar) {
      avatar = user.avatar;
    }
    const category = await Category.findOne({slug: req.params.slug});
    const categoryId = category._id;
    let data = await Product.find({
      categoryID: new mongoose.Types.ObjectId(categoryId),
    }).sort({productName:1}).select('-_id productName priceOut slug productImage');
    let title = category.categoryName;
    let id = category.slug;

    res.render("layouts/clients/category/category", {
      fullname: req.session.fullname,
      userid: req.session.userid,
      sID: req.session.sessionID,
      cart: req.session.cart,
      data,
      VND,
      title,
      id,
      avatar: avatar,
    });
  } else {
    const category = await Category.findOne({slug: req.params.slug});
    const categoryId = category._id;

    let data = await Product.find({
      categoryID: new mongoose.Types.ObjectId(categoryId),
    }).sort({productName:1}).select('-_id productName priceOut slug productImage');

    let title = category.categoryName;
    let id = category.slug;
    res.render("layouts/clients/category/category", {
      fullname: 1,
      userid: 1,
      sID: req.session.sessionID,
      cart: 0,
      data,
      VND,
      title,
      id,
      avatar: "user (2).png",
    });
  }
});

//Servers
//Trang đăng nhập
app.get("/admin_login", (req, res) => {
  if (req.session.daDangNhap) {
    res.redirect("/admin_home");
  } else {
    res.render("layouts/servers/login", {
      error: req.flash("error"),
      errorEmail: req.flash("errorEmail"),
    });
  }
});

//Xử lý đăng nhập
app.post("/admin_login", async (req, res) => {
  //Kiểm tra xem tài khoản có tồn tại hay không
  let errorEmail = req.body.email;
  let errorPassword = req.body.password;
  let email_regex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  let e = 0;
  if (errorEmail == "") {
    req.flash("error", "Vui lòng nhập Email");
    e++;
  } else {
    if (email_regex.test(errorEmail) == false) {
      req.flash("error", "Sai định dạng Email");
      req.flash("errorEmail", errorEmail);
      e++;
    } else {
      const admin = await Admin.findOne({ email: req.body.email });
      if (admin) {
        //Kiểm tra mật khẩu
        if (errorPassword == "") {
          req.flash("error", "Vui lòng nhập mật khẩu");
          req.flash("errorEmail", errorEmail);
          e++;
        } else {
          const result = req.body.password === admin.password;
          if (result) {
            if(admin.status != 0){
              e++;
              req.flash("error", "Tài khoản chưa được kích hoạt!");
            } else {
              var sess = req.session;
              sess.daDangNhap = true;
              sess.adminName = admin.fullname;
              sess.admin_id = admin._id;
              sess.admin_role = admin.role;
              res.redirect("/admin_home");
            }
          } else {
            req.flash("error", "Sai mật khẩu");
            req.flash("errorEmail", errorEmail);
            e++;
          }
        }
      } else {
        req.flash("error", "Tài khoản không tồn tại");
        req.flash("errorEmail", errorEmail);
        e++;
      }
    }
  }
  if (e != 0) {
    res.redirect("/admin_login");
  }
});

//Đăng xuất
app.get("/admin_logout", (req, res) => {
  req.session.destroy();
  res.redirect("/admin_login");
});

//Trang home admin
app.get("/admin_home", async (req, res) => {
  if (req.session.daDangNhap) {
    const order = await Order.find({ orderStatus: 0 }).count();
    const today = moment.tz(Date.now(), "Asia/Ho_Chi_Minh").format("DD/MM/YYYY");
    const orders = await Order.find({$and:[{orderStatus:0},{day:today}]}).count();
    const customer = await User.find().count();
    const employee = await Admin.find().count();
    const comment = await Comment.find().count();

    let outOfStock = await Product.find({ productQuantity: { $lte: 5 } }).sort(
      { productQuantity: 1 }
    );

    async function getBestSalesByMonth() {
      let bestSalesByMonth = await Order.aggregate([
        { $match: { orderStatus: 3 } },
        {
          $project: {
            month: { $toInt: "$month" },
            items: 1,
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: { month: "$month", productID: "$items._id" },
            totalCount: { $sum: "$items.quantity" },
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "_id.productID",
            foreignField: "_id",
            as: "productList",
          },
        },
        {
          $project: {
            month: "$_id.month",
            product: { $arrayElemAt: ["$productList", 0] },
            totalCount: 1,
          },
        },
        { $sort: { month: 1 } },
        {
          $group: {
            _id: "$month",
            bestSales: {
              $push: {
                product: "$product",
                totalCount: "$totalCount",
              },
            },
          },
        },
        {
          $sort: { _id: 1 }
        },
        {
          $project: {
            _id: 0,
            month: "$_id",
            bestSales: {
              $slice: ["$bestSales", 5]
            },
          },
        },
        {
          $unwind: "$bestSales"
        },
        {
          $sort: {
            "bestSales.totalCount": -1
          }
        },
        {
          $group: {
            _id: "$month",
            bestSales: {
              $push: "$bestSales"
            }
          }
        },
        {
          $project: {
            _id: 0,
            month: "$_id",
            bestSales: 1
          }
        }
      ]);
      return bestSalesByMonth;
    }
    let result = await getBestSalesByMonth();
    let monthsData = result.reduce((acc, cur) => {
      let month = cur.month;
      let bestSales = cur.bestSales.slice(0, 5);
      if (!acc[month]) {
        acc[month] = {
          month: month,
          sales: [],
        };
      }
      for (let j = 0; j < bestSales.length; j++) {
        acc[month].sales.push({
          productName: bestSales[j].product.productName,
          productImage: bestSales[j].product.productImage,
          totalCount: bestSales[j].totalCount,
        });
      }
      return acc;
    }, {});
    let bestSale = Object.values(monthsData);

    let sale = await Sale.find();
    let monthlyData = [];
    for(let i = 0; i < 12; i++){
      monthlyData.push(sale[i].revenue);
    }

    res.render("layouts/servers/home", {
      adminName: req.session.adminName,
      number: customer,
      numberal: employee,
      order: order,
      orders: orders,
      admin_id: req.session.admin_id,
      admin_role: req.session.admin_role,
      VND,
      bestSale,
      outOfStock,
      comment,
      monthlyData,
    });
  } else {
    res.redirect("/admin_login");
  }
});

//Trang thể loại
app.get("/admin_categories", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 1) {
      let data = await Category.find();
      res.render("layouts/servers/categories/categories", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        danhsach: data,
        admin_role: req.session.admin_role,
        success: req.flash("success"),
        error: req.flash("error"),
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Trang thêm thể loại
app.get("/add_categories", (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 1) {
      res.render("layouts/servers/categories/add_categories", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        admin_role: req.session.admin_role,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Lưu thể loại mới
app.post("/categories_save", async (req, res) => {
  if (req.session.daDangNhap) {
    var check = await Category.findOne({ categoryName: req.body.categoryName });
    if (check) {
      req.flash("error", "Thể loại đã tồn tại");
      res.redirect("/admin_categories");
    } else {
      await Category({
        categoryName: req.body.categoryName,
        slug: slugify(req.body.categoryName, {replacement: '-',lower: true}),
      }).save();
      req.flash("success", "Thêm thành công");
      res.redirect("/admin_categories");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Sửa thể loại
app.get("/edit_categories/:slug", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 1) {
      let data = await Category.findOne({slug:req.params.slug});
      res.render("layouts/servers/categories/edit_categories", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        danhsach: data,
        admin_role: req.session.admin_role,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Lưu thể loại sau khi sửa
app.post("/edit_categories_save", async (req, res) => {
  if (req.session.daDangNhap) {
    var check = await Category.findOne({ categoryName: req.body.categoryName });
    if (check) {
      req.flash("error", "Sửa không thành công");
      res.redirect("/admin_categories");
    } else {
      await Category.updateOne(
        { _id: req.body.categoryId },
        {
          categoryName: req.body.categoryName,
        }
      );
      req.flash("success", "Sửa thành công");
      res.redirect("/admin_categories");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Xoá thể loại
app.get("/delete_categories/:slug", async (req, res) => {
  if (req.session.daDangNhap) {
    await Category.deleteOne({ slug: req.params.slug });
    req.flash("success", "Xoá thành công");
    res.redirect("/admin_categories");
  } else {
    res.redirect("/admin_login");
  }
});

//Trang nhà sản xuất
app.get("/admin_producers", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 1) {
      let data = await Producer.find();
      res.render("layouts/servers/producers/producers", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        danhsach: data,
        admin_role: req.session.admin_role,
        success: req.flash("success"),
        error: req.flash("error"),
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Trang thêm nhà sản xuất
app.get("/add_producers", (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 1) {
      res.render("layouts/servers/producers/add_producers", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        admin_role: req.session.admin_role,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Lưu nhà sản xuất mới
app.post("/producers_save", async (req, res) => {
  if (req.session.daDangNhap) {
    var check = await Producer.findOne({ producerName: req.body.producerName });
    if (check) {
      req.flash("error", "NSX đã tồn tại");
      res.redirect("/admin_producers");
    } else {
      await Producer({
        producerName: req.body.producerName,
        slug: slugify(req.body.producerName, {replacement: '-',lower: true}),
      }).save();
      req.flash("success", "Thêm thành công");
      res.redirect("/admin_producers");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Sửa nhà sản xuất
app.get("/edit_producers/:slug", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 1) {
      let data = await Producer.findOne({slug:req.params.slug});
      res.render("layouts/servers/producers/edit_producers", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        danhsach: data,
        admin_role: req.session.admin_role,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Lưu nhà sản xuất sau khi sửa
app.post("/edit_producers_save", async (req, res) => {
  if (req.session.daDangNhap) {
    var check = await Producer.findOne({ producerName: req.body.producerName });
    if (check) {
      req.flash("error", "Sửa không thành công");
      res.redirect("/admin_producers");
    } else {
      await Producer.updateOne(
        { _id: req.body.producerId },
        {
          producerName: req.body.producerName,
        }
      );
      req.flash("success", "Sửa thành công");
      res.redirect("/admin_producers");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Xoá nhà sản xuất
app.get("/delete_producers/:slug", async (req, res) => {
  if (req.session.daDangNhap) {
    await Producer.deleteOne({ slug: req.params.slug });
    req.flash("success", "Xoá thành công");
    res.redirect("/admin_producers");
  } else {
    res.redirect("/admin_login");
  }
});

//Trang sản phẩm
app.get("/admin_product", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 1) {
      let data = await Product.find()
        .populate("categoryID")
        .populate("producerID")
        .sort({"productName":1});
      res.render("layouts/servers/product/product", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        danhsach: data,
        VND,
        admin_role: req.session.admin_role,
        success: req.flash("success"),
        error: req.flash("error"),
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Trang chi tiết sản phẩm
app.get("/admin_product/:slug", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 1) {
      let product = await Product.findOne({ slug: req.params.slug });
      let prname = product.productName;
      let data = await Product.findOne({ slug: req.params.slug })
        .populate("categoryID")
        .populate("producerID");
      res.render("layouts/servers/product/product_detail", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        danhsach: data,
        VND,
        prname,
        admin_role: req.session.admin_role,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Trang thêm sản phẩm
app.get("/add_product", (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 1) {
      res.render("layouts/servers/product/add_product", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        VND,
        admin_role: req.session.admin_role,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Lưu sản phẩm mới
app.post("/save_product", async (req, res) => {
  if (req.session.daDangNhap) {
    upload(req, res, async function (err) {
      if (err instanceof multer.MulterError) {
        req.flash("error", "Lỗi Multer khi upload ảnh");
      } else if (err) {
        req.flash("error", "Lỗi bất ngờ xảy ra");
      } else {
        let check = await Product.findOne({
          productName: req.body.productName,
        });
        if (check) {
          req.flash("error", "Sản phẩm đã tồn tại");
          res.redirect("/admin_product");
        } else {
          await Product({
            productName: req.body.productName,
            slug: slugify(req.body.productName, {replacement: '-',lower: true}),
            productDescription: req.body.productDescription,
            productImage: req.file.filename,
            categoryID: req.body.categoryID,
            producerID: req.body.producerID,
            priceIn: req.body.priceIn,
            priceOut: req.body.priceOut,
            productStatus: req.body.productStatus,
            productQuantity: 0,
            created_date: moment
              .tz(Date.now(), "Asia/Ho_Chi_Minh")
              .format("DD/MM/YYYY hh:mm a"),
            created_by: req.session.adminName,
          }).save();
          req.flash("success", "Thêm thành công");
          res.redirect("/admin_product");
        }
      }
    });
  } else {
    res.redirect("/admin_login");
  }
});

//Trang sửa sản phẩm
app.get("/edit_product/:slug", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 1) {
      let data = await Product.findOne({slug:req.params.slug})
        .populate("categoryID")
        .populate("producerID");
      res.render("layouts/servers/product/edit_product", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        danhsach: data,
        VND,
        admin_role: req.session.admin_role,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Lưu sản phẩm sau khi sửa
app.post("/edit_product_save", async (req, res) => {
  if (req.session.daDangNhap) {
    let check = await Product.findOne({ productName: req.body.productName });
    if (check) {
      req.flash("error", "Sản phẩm đã tồn tại");
      res.redirect("/admin_product");
    } else {
      upload(req, res, async function (err) {
        //Không chọn file mới
        if (!req.file) {
          await Product.updateOne(
            { _id: req.body.productId },
            {
              productName: req.body.productName,
              productDescription: req.body.productDescription,
              categoryID: req.body.categoryID,
              producerID: req.body.producerID,
              priceIn: req.body.priceIn,
              priceOut: req.body.priceOut,
              productStatus: req.body.productStatus,
              updated_by: req.session.adminName,
              updated_date: moment
                .tz(Date.now(), "Asia/Ho_Chi_Minh")
                .format("DD/MM/YYYY hh:mm a"),
            }
          );
          req.flash("success", "Sửa thành công");
          res.redirect("/admin_product");
          // Chọn file mới
        } else {
          if (err instanceof multer.MulterError) {
            req.flash("error", "Lỗi Multer khi upload ảnh");
          } else if (err) {
            req.flash("error", "Lỗi bất ngờ xảy ra");
          } else {
            await Product.updateOne(
              { _id: req.body.productId },
              {
                productName: req.body.productName,
                productDescription: req.body.productDescription,
                productImage: req.file.filename,
                categoryID: req.body.categoryID,
                producerID: req.body.producerID,
                priceIn: req.body.priceIn,
                priceOut: req.body.priceOut,
                productStatus: req.body.productStatus,
                updated_by: req.session.adminName,
                updated_date: moment
                  .tz(Date.now(), "Asia/Ho_Chi_Minh")
                  .format("DD/MM/YYYY hh:mm a"),
              }
            );
            req.flash("success", "Sửa thành công");
            res.redirect("/admin_product");
          }
        }
      });
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Trang danh sách khách hàng
app.get("/customers", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 3) {
      let data = await User.find();
      res.render("layouts/servers/customer/customer", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        nhanvat: data,
        admin_role: req.session.admin_role,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Nhân viên
app.get("/employees", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0) {
      let data = await Admin.find();
      res.render("layouts/servers/employee/employee", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        nhanvat: data,
        admin_role: req.session.admin_role,
        success: req.flash("success"),
        error: req.flash("error"),
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Trang thông tin cá nhân của nhân viên
app.get("/admin_profile/:id", async (req, res) => {
  if (req.session.daDangNhap) {
    let data = await Admin.findById({ _id: req.params.id });
    res.render("layouts/servers/employee/profile", {
      adminName: req.session.adminName,
      admin_id: req.session.admin_id,
      nhanvat: data,
      admin_role: req.session.admin_role,
    });
  } else {
    res.redirect("/admin_login");
  }
});

//Trang cập nhập mật khẩu của nhân viên 
app.get("/admin_setting/:id", async (req, res) => {
  if (req.session.daDangNhap) {
    let data = await Admin.findById({ _id: req.params.id });
    res.render("layouts/servers/employee/setting", {
      adminName: req.session.adminName,
      admin_id: req.session.admin_id,
      nhanvat: data,
      admin_role: req.session.admin_role,
      passwordError: req.flash("passwordError"),
      password1Error: req.flash("password1Error"),
      passwordED: req.flash("passwordED"),
      password1ED: req.flash("password1ED"),
    });
  } else {
    res.redirect("/admin_login");
  }
});

//Trang thêm nhân viên
app.get("/add_employee", (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0) {
      res.render("layouts/servers/employee/add_employee", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        admin_role: req.session.admin_role,
        nameError: req.flash("nameError"),
        usernameError: req.flash("usernameError"),
        emailError: req.flash("emailError"),
        passwordError: req.flash("passwordError"),
        emailED: req.flash("emailED"),
        nameED: req.flash("nameED"),
        usernameED: req.flash("usernameED"),
        passwordED: req.flash("passwordED"),
        errorUsername: req.flash("errorUsername"),
        errorEmail: req.flash("errorEmail"),
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Lưu nhân viên
app.post("/admin_save", async (req, res) => {
  if (req.session.daDangNhap) {
    var email_regex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    var vnn_regex =
      /^[a-zA-Z'-'\saAàÀảẢãÃáÁạẠăĂằẰẳẲẵẴắẮặẶâÂầẦẩẨẫẪấẤậẬbBcCdDđĐeEèÈẻẺẽẼéÉẹẸêÊềỀểỂễỄếẾệỆfFgGhHiIìÌỉỈĩĨíÍịỊjJkKlLmMnNoOòÒỏỎõÕóÓọỌôÔồỒổỔỗỖốỐộỘơƠờỜởỞỡỠớỚợỢpPqQrRsStTuUùÙủỦũŨúÚụỤưƯừỪửỬữỮứỨựỰvVwWxXyYỳỲỷỶỹỸýÝỵỴzZ]*$/g;
    var vnp_regex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/gm;
    let errorForm = 0;
    var name = req.body.fullname;
    var email = req.body.email;
    var username = req.body.username;
    var password = req.body.password;
    if (name == "") {
      req.flash("nameError", "Bạn chưa điền họ và tên!");
      errorForm++;
    }
    if (email == "") {
      req.flash("emailError", "Bạn chưa điền Email!");
      errorForm++;
    }
    if (username == "") {
      req.flash("usernameError", "Bạn chưa điền tên đăng nhập!");
      errorForm++;
    }
    if (password == "") {
      req.flash("passwordError", "Bạn chưa đặt mật khẩu!");
      errorForm++;
    }
    if (name != "") {
      if (vnn_regex.test(name) == false) {
        req.flash("nameError", "Sai định dạng Họ và tên!");
        req.flash("nameED", name);
        errorForm++;
      } else {
        let nameED = name;
        req.flash("nameED", nameED);
      }
    }
    if (email != "") {
      const checkEmail = await Admin.findOne({ email: email });
      if (checkEmail) {
        req.flash("errorEmail", "Email đã tồn tại");
        req.flash("emailED", email);
        errorForm++;
      } else {
        if (email_regex.test(email) == false) {
          req.flash("emailError", "Sai định dạng Email!");
          req.flash("emailED", email);
          errorForm++;
        } else {
          let emailED = email;
          req.flash("emailED", emailED);
        }
      }
    }
    if (username != "") {
      const checkUsername = await Admin.findOne({ username: username });
      if (checkUsername) {
        req.flash("errorUsername", "Username đã tồn tại");
        req.flash("usernameED", username);
        errorForm++;
      } else {
        req.flash("usernameED", username);
      }
    }
    if (password != "") {
      if (vnp_regex.test(password) == false) {
        req.flash(
          "passwordError",
          "Mật khẩu tối thiểu tám ký tự, ít nhất một chữ cái, một số và một ký tự đặc biệt!"
        );
        errorForm++;
      }
    }
    if (errorForm != 0) {
      res.redirect("/add_employee");
    } else {
      await Admin({
        fullname: req.body.fullname,
        email: req.body.email,
        password: req.body.password,
        username: req.body.username,
        role: req.body.role,
        status: req.body.status,
      }).save();
      req.flash("success", "Thêm thành công");
      res.redirect("/employees");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Trang sửa thông tin nhân viên
app.get("/edit/:id", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0) {
      let data = await Admin.findById(req.params.id);
      res.render("layouts/servers/employee/edit_employee", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        nhanvat: data,
        admin_role: req.session.admin_role,
        nameError: req.flash("nameError"),
        usernameError: req.flash("usernameError"),
        emailError: req.flash("emailError"),
        emailED: req.flash("emailED"),
        nameED: req.flash("nameED"),
        usernameED: req.flash("usernameED"),
        errorUsername: req.flash("errorUsername"),
        errorEmail: req.flash("errorEmail"),
        passwordError: req.flash("passwordError"),
        passwordED: req.flash("passwordED"),
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Lưu thông tin sau khi sửa
app.post("/edit_save", async (req, res) => {
  if (req.session.daDangNhap) {
    let id = req.body.id;
    var email_regex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    var vnp_regex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/gm;
    var vnn_regex =
      /^[a-zA-Z'-'\saAàÀảẢãÃáÁạẠăĂằẰẳẲẵẴắẮặẶâÂầẦẩẨẫẪấẤậẬbBcCdDđĐeEèÈẻẺẽẼéÉẹẸêÊềỀểỂễỄếẾệỆfFgGhHiIìÌỉỈĩĨíÍịỊjJkKlLmMnNoOòÒỏỎõÕóÓọỌôÔồỒổỔỗỖốỐộỘơƠờỜởỞỡỠớỚợỢpPqQrRsStTuUùÙủỦũŨúÚụỤưƯừỪửỬữỮứỨựỰvVwWxXyYỳỲỷỶỹỸýÝỵỴzZ]*$/g;
    let errorForm = 0;
    var name = req.body.fullname;
    var email = req.body.email;
    var username = req.body.username;
    var password = req.body.password;
    if (name == "") {
      req.flash("nameError", "Bạn chưa điền họ và tên!");
      errorForm++;
    }
    if (password == "") {
      req.flash("passwordError", "Bạn chưa điền mật khẩu!");
      errorForm++;
    }
    if (email == "") {
      req.flash("emailError", "Bạn chưa điền Email!");
      errorForm++;
    }
    if (username == "") {
      req.flash("usernameError", "Bạn chưa điền tên đăng nhập!");
      errorForm++;
    }
    if (name != "") {
      if (vnn_regex.test(name) == false) {
        req.flash("nameError", "Sai định dạng Họ và tên!");
        req.flash("nameED", name);
        errorForm++;
      } else {
        let nameED = name;
        req.flash("nameED", nameED);
      }
    }
    if (password != "") {
      if (vnp_regex.test(password) == false) {
        req.flash(
          "passwordError",
          "Mật khẩu tối thiểu tám ký tự, ít nhất một chữ cái, một số và một ký tự đặc biệt!"
        );
        req.flash("passwordED", password);
        errorForm++;
      } else {

        let passwordED = password;
        req.flash("passwordED", passwordED);
      }
    }
    if (email != "") {
      const checkEmail = await Admin.findOne({ email: email });
      if (checkEmail) {
        req.flash("errorEmail", "Email đã tồn tại");
        req.flash("emailED", email);
        errorForm++;
      } else {
        if (email_regex.test(email) == false) {
          req.flash("emailError", "Sai định dạng Email!");
          req.flash("emailED", email);
          errorForm++;
        } else {
          let check = await Admin.findOne({email:email});
          if(check){
            req.flash("emailError", "Email đã tồn tại!");
            req.flash("emailED", email);
            errorForm++;
          } else {
          let emailED = email;
          req.flash("emailED", emailED);
          }
        }
      }
    }
    if (username != "") {
      const checkUsername = await Admin.findOne({ username: username });
      if (checkUsername) {
        req.flash("errorUsername", "Username đã tồn tại");
        req.flash("usernameED", username);
        errorForm++;
      } else {
        req.flash("usernameED", username);
      }
    }
    if (errorForm != 0) {
      res.redirect("/edit/" + id);
    } else {
      await Admin.updateOne(
        { _id: req.body.id },
        {
          fullname: req.body.fullname,
          email: req.body.email,
          username: req.body.username,
          role: req.body.role,
          status: req.body.status,
          password: req.body.password,
        }
      );
      req.flash("success", "Sửa thành công");
      res.redirect("/employees");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Xoá nhân viên
app.get("/delete/:id", async (req, res) => {
  if (req.session.daDangNhap) {
    await Admin.deleteOne({ _id: req.params.id });
    req.flash("success", "Xoá thành công");
    res.redirect("/employees");
  } else {
    res.redirect("/admin_login");
  }
});

//Trang thông tin nhân viên kho
app.get("/employees_store", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0) {
      let data = await Admin.find({ role: 1 });
      res.render("layouts/servers/employee/store_employee", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        nhanvat: data,
        admin_role: req.session.admin_role,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Trang thông tin nhân viên đơn hàng
app.get("/employees_order", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0) {
      let data = await Admin.find({ role: 2 });
      res.render("layouts/servers/employee/order_employee", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        nhanvat: data,
        admin_role: req.session.admin_role,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Trang thông tin nhân viên CSKH
app.get("/employees_customer_care", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0) {
      let data = await Admin.find({ role: 3 });
      res.render("layouts/servers/employee/customer_care_employee", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        nhanvat: data,
        admin_role: req.session.admin_role,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Lưu mật khẩu mới cho nhân viên
app.post("/adminSaveNewPw", async (req, res) => {
  var adminid = req.session.admin_id;
  var password1 = req.body.password1;
  var password = req.body.password;
  var password2 = req.body.password2;
  var vnp_regex =
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/gm;
  let errorForm = 0;

  if (password1 == "") {
    req.flash("password1Error", "Bạn cần nhập mật khẩu cũ!");
    errorForm++;
  }
  if (password1 != "") {
    let check = await Admin.findOne({ _id: adminid });
    let pcheck = check.password;
    if (password1 != pcheck) {
      req.flash("password1Error", "Mật khẩu cũ sai!");
      errorForm++;
    } else {
      req.flash("password1ED", password1);
    }
  }
  if (password == "") {
    req.flash("passwordError", "Bạn chưa đặt mật khẩu!");
    errorForm++;
  }
  if (password != "") {
    if (vnp_regex.test(password) == false) {
      req.flash(
        "passwordError",
        "Mật khẩu tối thiểu tám ký tự, ít nhất một chữ cái, một số và một ký tự đặc biệt!"
      );
      errorForm++;
    } else {
      if (password2 == "") {
        req.flash("passwordError", "Vui lòng xác thực lại mật khẩu!");
        req.flash("passwordED", password);
        errorForm++;
      } else {
        if (password != password2) {
          req.flash("passwordError", "Mật khẩu không trùng khớp");
          req.flash("passwordED", password);
          errorForm++;
        } else {
          await Admin.updateOne(
            { _id: adminid },
            { $set: { password: password } }
          );
          req.flash("passwordED", "");
          req.session.destroy();
          res.redirect("/admin_login");
        }
      }
    }
  }
  if (errorForm != 0) {
    res.redirect("/admin_setting/" + adminid);
  }
});

//Trang quản lý đơn hàng
app.get("/all_orders", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 2) {
      const today = moment.tz(Date.now(), "Asia/Ho_Chi_Minh").format("DD/MM/YYYY");
      let data = await Order.find()
        .populate("userID")
        .sort({ orderStatus: 1, timeIn: -1 });
      const orderToday = await Order.find({ day: today }).count();
      const orderNew = await Order.find({ orderStatus: 0 }).count();
      const orderAccept = await Order.find({ orderStatus: 1 }).count();
      const orderVroom = await Order.find({ orderStatus: 2 }).count();
      const orderDone = await Order.find({ orderStatus: 3 }).count();
      const orderCancel = await Order.find({ orderStatus: 4 }).count();
      const orderCoupon = await Order.find({ couponCode:{$ne : "Không"}}).count();
      res.render("layouts/servers/orders/all_orders", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        admin_role: req.session.admin_role,
        danhsach: data,
        VND,
        orderNew: orderNew,
        orderAccept: orderAccept,
        orderVroom: orderVroom,
        orderDone: orderDone,
        orderCancel: orderCancel,
        orderCoupon: orderCoupon,
        orderToday: orderToday,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Đơn hôm nay
app.get("/all_orders_today", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 2) {
      const today = moment.tz(Date.now(), "Asia/Ho_Chi_Minh").format("DD/MM/YYYY");
      let order = await Order.find({day:today}).count();
      let data = await Order.find({day:today})
        .populate("userID")
        .sort({ orderStatus: 1, timeIn: -1 });
      const orderNew = await Order.find({$and:[{orderStatus:0},{day:today}]}).count();
      const orderAccept = await Order.find({$and:[{orderStatus:1},{day:today}]}).count();
      const orderVroom = await Order.find({$and:[{orderStatus:2},{day:today}]}).count();
      const orderDone = await Order.find({$and:[{orderStatus:3},{day:today}]}).count();
      const orderCancel = await Order.find({$and:[{orderStatus:4},{day:today}]}).count();
      const orderCoupon = await Order.find({$and:[{ couponCode:{$ne : "Không"}},{day:today}]}).count();
      res.render("layouts/servers/orders/all_orders_today", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        admin_role: req.session.admin_role,
        danhsach: data,
        VND,
        orderNew: orderNew,
        orderAccept: orderAccept,
        orderVroom: orderVroom,
        orderDone: orderDone,
        orderCancel: orderCancel,
        orderCoupon: orderCoupon,
        today,
        order,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Đơn chưa được xác nhận
app.get("/new_orders", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 2) {
      let data = await Order.find({ orderStatus: 0 }).populate("userID");
      const order = await Order.find({ orderStatus: 0 }).count();
      res.render("layouts/servers/orders/new_orders", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        admin_role: req.session.admin_role,
        danhsach: data,
        VND,
        order,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Đơn mới hôm nay
app.get("/new_orders_today", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 2) {
      const today = moment.tz(Date.now(), "Asia/Ho_Chi_Minh").format("DD/MM/YYYY");
      let data = await Order.find({$and:[{orderStatus:0},{day:today}]}).populate("userID");
      const order = await Order.find({$and:[{orderStatus:0},{day:today}]}).count();
      res.render("layouts/servers/orders/new_orders_today", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        admin_role: req.session.admin_role,
        danhsach: data,
        VND,
        order,
        today,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Đơn đã được xác nhận
app.get("/accept_orders", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 2) {
      let data = await Order.find({ orderStatus: 1 }).populate("userID");
      const order = await Order.find({ orderStatus: 1 }).count();
      res.render("layouts/servers/orders/accept_orders", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        admin_role: req.session.admin_role,
        danhsach: data,
        VND,
        order,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Đơn đã được xác nhận hôm nay
app.get("/accept_orders_today", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 2) {
      const today = moment.tz(Date.now(), "Asia/Ho_Chi_Minh").format("DD/MM/YYYY");
      let data = await Order.find({$and:[{orderStatus:1},{day:today}]}).populate("userID");
      const order = await Order.find({$and:[{orderStatus:1},{day:today}]}).count();
      res.render("layouts/servers/orders/accept_orders_today", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        admin_role: req.session.admin_role,
        danhsach: data,
        VND,
        order,
        today,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Đơn đang vận chuyển
app.get("/vroom_orders", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 2) {
      let data = await Order.find({ orderStatus: 2 }).populate("userID");
      const order = await Order.find({ orderStatus: 2 }).count();
      res.render("layouts/servers/orders/vroom_orders", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        admin_role: req.session.admin_role,
        danhsach: data,
        VND,
        order,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Đơn đang vận chuyển hôm nay
app.get("/vroom_orders_today", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 2) {
      const today = moment.tz(Date.now(), "Asia/Ho_Chi_Minh").format("DD/MM/YYYY");
      let data = await Order.find({$and:[{orderStatus:2},{day:today}]}).populate("userID");
      const order = await Order.find({$and:[{orderStatus:2},{day:today}]}).count();
      res.render("layouts/servers/orders/vroom_orders_today", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        admin_role: req.session.admin_role,
        danhsach: data,
        VND,
        order,
        today,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Đơn đã hoàn thành
app.get("/done_orders", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 2) {
      let data = await Order.find({ orderStatus: 3 }).populate("userID");
      res.render("layouts/servers/orders/done_orders", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        admin_role: req.session.admin_role,
        danhsach: data,
        VND,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Đơn đã hoàn thành hôm nay
app.get("/done_orders_today", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 2) {
      const today = moment.tz(Date.now(), "Asia/Ho_Chi_Minh").format("DD/MM/YYYY");
      let data = await Order.find({$and:[{orderStatus:3},{day:today}]}).populate("userID");
      const order = await Order.find({$and:[{orderStatus:3},{day:today}]}).count();
      res.render("layouts/servers/orders/done_orders_today", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        admin_role: req.session.admin_role,
        danhsach: data,
        VND,
        today,
        order,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Đơn bị huỷ
app.get("/cancel_orders", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 2) {
      let data = await Order.find({ orderStatus: 4 }).populate("userID");
      res.render("layouts/servers/orders/cancel_orders", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        admin_role: req.session.admin_role,
        danhsach: data,
        VND,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Đơn bị huỷ hôm nay
app.get("/cancel_orders_today", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 2) {
      const today = moment.tz(Date.now(), "Asia/Ho_Chi_Minh").format("DD/MM/YYYY");
      let data = await Order.find({$and:[{orderStatus:4},{day:today}]}).populate("userID");
      const order = await Order.find({$and:[{orderStatus:4},{day:today}]}).count();
      res.render("layouts/servers/orders/cancel_orders_today", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        admin_role: req.session.admin_role,
        danhsach: data,
        VND,
        today,
        order,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Đơn hàng dùng coupon
app.get("/coupon_orders", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 2) {
      let data = await Order.find({ couponCode: { $ne: "Không" } }).populate("userID");
      const order = await Order.find({ couponCode: { $ne: "Không" } }).count();
      res.render("layouts/servers/orders/coupon_orders", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        admin_role: req.session.admin_role,
        danhsach: data,
        VND,
        order,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Đơn hàng dùng coupon hôm nay
app.get("/coupon_orders_today", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 2) {
      const today = moment.tz(Date.now(), "Asia/Ho_Chi_Minh").format("DD/MM/YYYY");
      let data = await Order.find({$and:[{ couponCode:{$ne : "Không"}},{day:today}]}).populate("userID");
      const order = await Order.find({$and:[{ couponCode:{$ne : "Không"}},{day:today}]}).count();
      res.render("layouts/servers/orders/coupon_orders_today", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        admin_role: req.session.admin_role,
        danhsach: data,
        VND,
        today,
        order,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Chi tiết đơn hàng
app.get("/order_detail/:orderCode", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 2) {
      let data = await Order.findOne({ orderCode: req.params.orderCode }).populate(
        "items.productID"
      );
      let code = data.couponCode;
      if (code == "Không") {
        let money = 0;
        let couponValue = 0;
        let couponType = 0;
        data.items.forEach(function (pid) {
          money += pid.productID.priceOut * pid.quantity;
        });
        res.render("layouts/servers/orders/order_detail", {
          adminName: req.session.adminName,
          admin_id: req.session.admin_id,
          admin_role: req.session.admin_role,
          danhsach: data,
          VND,
          money,
          couponValue,
          couponType,
        });
      } else if (code != "Không") {
        let coupon = await Coupon.findOne({ couponCode: code });
        let couponValue = coupon.couponValue;
        let couponType = coupon.couponType;
        let money = 0;
        data.items.forEach(function (pid) {
          money += pid.productID.priceOut * pid.quantity;
        });
        res.render("layouts/servers/orders/order_detail", {
          adminName: req.session.adminName,
          admin_id: req.session.admin_id,
          admin_role: req.session.admin_role,
          danhsach: data,
          VND,
          money,
          couponValue,
          couponType,
        });
      }
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

// Tự động cập nhật đơn hàng
// async function update(){
//   await Order.updateMany({ orderStatus: 0 }, { orderStatus: 1 });
//   await Order.updateMany({ orderStatus: 1 }, { orderStatus: 2 });
// }

// setInterval(update, 10000);

//Cập nhật trạng thái đơn hàng từ mới sang đã xác nhận
app.post("/update_status/:orderCode", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 2) {
      await Order.updateOne({ orderCode: req.params.orderCode }, { orderStatus: 1 });
      let find = await Order.findOne({orderCode: req.params.orderCode}).populate("userID");
      let email = find.userID.email;
      const emailData = {
        from: "Gaming Shop",
        to: email,
        subject: "Xác nhận đơn hàng",
        html: `
        <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <img src="https://github.com/lam3531/vietnam/blob/main/gamingstore-logoo.png?raw=true" alt="Logo" style="display: block; margin: 0 auto; max-width: 30%;">
        <h1 style="color: #333333; text-align: center; margin-bottom: 20px; font-size: 24px;">Xác nhận đơn hàng - [${find.orderCode}]</h1>
        <p style="color: #555555; font-size: 16px; margin-bottom: 10px;">Chúng tôi rất vui thông báo rằng đơn hàng của bạn đã được xác nhận.</p>
        <p style="color: #555555; font-size: 16px; margin-bottom: 15px;">
          Bạn có thể theo dõi thông tin đơn hàng tại chi tiết đơn hàng của bạn
        </p>
        <p style="color: #555555; font-size: 16px; margin-bottom: 15px;">Chúng tôi sẽ tiến hành xử lý đơn hàng của bạn và sẽ thông báo cho bạn khi đơn hàng được gửi đi.
        Nếu bạn có bất kỳ câu hỏi hoặc yêu cầu nào, vui lòng liên hệ với chúng tôi qua thông tin liên hệ bên dưới.</p>
        <p style="font-size: 16px; margin-top: 20px; text-align: center;">
          Xin cảm ơn bạn đã mua hàng tại cửa hàng chúng tôi!
        </p>
      </div>
        `,
      };
      await transporter.sendMail(emailData);
      res.redirect("/all_orders");
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Cập nhật trạng thái đơn hàng từ đã xác nhận sang vận chuyển
app.post("/update_status_1/:orderCode", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 2) {
      await Order.updateOne({ orderCode: req.params.orderCode }, { orderStatus: 2 });
      let find = await Order.findOne({orderCode: req.params.orderCode}).populate("userID");
      let email = find.userID.email;
      const emailData = {
        from: "Gaming Shop",
        to: email,
        subject: "Vận chuyển đơn hàng",
        html: `
        <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <img src="https://github.com/lam3531/vietnam/blob/main/gamingstore-logoo.png?raw=true" alt="Logo" style="display: block; margin: 0 auto; max-width: 30%;">
        <h1 style="color: #333333; text-align: center; margin-bottom: 20px; font-size: 24px;">Đang vận chuyển đơn hàng - [${find.orderCode}]</h1>
        <p style="color: #555555; font-size: 16px; margin-bottom: 10px;">Chúng tôi rất vui thông báo rằng đơn hàng của bạn đang được vận chuyển.</p>
        <p style="color: #555555; font-size: 16px; margin-bottom: 15px;">
          Bạn có thể theo dõi thông tin đơn hàng tại chi tiết đơn hàng của bạn
        </p>
        <p style="color: #555555; font-size: 16px; margin-bottom: 15px;">Đơn hàng của bạn đang được vận chuyển và sẽ thông báo cho bạn khi đơn hàng đến địa chỉ giao hàng.
        Nếu bạn có bất kỳ câu hỏi hoặc yêu cầu nào, vui lòng liên hệ với chúng tôi qua thông tin liên hệ bên dưới.</p>
        <p style="font-size: 16px; margin-top: 20px; text-align: center;">
          Xin cảm ơn bạn đã mua hàng tại cửa hàng chúng tôi!
        </p>
      </div>
        `,
      };
      await transporter.sendMail(emailData);
      res.redirect("/all_orders");
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Cập nhật trạng thái đơn hàng từ mới sang bị huỷ
app.post("/admin_cancel_order/:orderCode", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 2) {
      await Order.updateOne(
        { orderCode: req.params.orderCode },
        {
          $set: {
            orderStatus: 4,
            cancelReason: req.body.cancelReason,
            cancelFrom: "Admin",
            timeOut: moment
              .tz(Date.now(), "Asia/Ho_Chi_Minh")
              .format("DD/MM/YYYY hh:mm a"),
          },
        }
      );
      let data = await Order.findOne({ orderCode: req.params.orderCode }).populate("userID");
      let email = data.userID.email;
      if (data.items.length == 1) {
        data.items.forEach(async function (id) {
          let qty = id.quantity;
          let pid = id._id;
          await Product.updateOne(
            { _id: pid },
            { $inc: { productQuantity: qty } }
          );
        });
      } else if (data.items.length > 1) {
        let arrayQ = [];
        let arrayP = [];
        data.items.forEach(async function (id) {
          let qty = id.quantity;
          let pid = id._id;
          arrayQ.push(qty);
          arrayP.push(pid);
        });
        for (let i = 0; i < arrayP.length; i++) {
          await Product.updateMany(
            { _id: arrayP[i] },
            { $inc: { productQuantity: arrayQ[i] } }
          );
        }
      }
      const emailData = {
        from: "Gaming Shop",
        to: email,
        subject: "Huỷ đơn hàng",
        html: `
        <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <img src="https://github.com/lam3531/vietnam/blob/main/gamingstore-logoo.png?raw=true" alt="Logo" style="display: block; margin: 0 auto; max-width: 30%;">
        <h1 style="color: #333333; text-align: center; margin-bottom: 20px; font-size: 24px;">Đang vận chuyển đơn hàng - [${data.orderCode}]</h1>
        <p style="color: #555555; font-size: 16px; margin-bottom: 10px;">Chúng tôi rất xin lỗi vì phải thông báo rằng đơn hàng của bạn đã bị huỷ.</p>
      </div>
        `,
      };
      await transporter.sendMail(emailData);
      res.redirect("/all_orders");
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Tự động cập nhật trạng thái đơn hàng từ đang vận chuyển sang đã nhận hàng
async function updateOrdersStatus() {
  const threeDaysAgo = moment().subtract(5, 'days').format('DD/MM/YYYY');
  const ordersToUpdate = await Order.find({$and:[{day: threeDaysAgo},{orderStatus:2}]});
  const ids = ordersToUpdate.map((order) => order._id);
  for (let i = 0; i < ids.length; i++) {
    await Order.updateMany(
      { _id: ids[i] },
      { $set: { orderStatus: 3,
        timeOut: moment
        .tz(Date.now(), "Asia/Ho_Chi_Minh")
        .format("DD/MM/YYYY hh:mm a"),
      time: moment.tz(Date.now(), "Asia/Ho_Chi_Minh").format("DD/MM/YYYY"),
      month: moment.tz(Date.now(), "Asia/Ho_Chi_Minh").month(), } }
    );
  }
}
setInterval(updateOrdersStatus, 10000);

//Tự động cập nhật doanh thu
async function moneyUpdate() {
  let monthlyDataIn = [];
  let monthlyDataOut = [];
  let monthlyDataRevenue = [];
  for (let i = 0; i < 12; i++) {
    let data = await Order.find({ month: i }).populate("items.productID");
    function calculateOrderStats(order) {
      let totalPriceIn = 0;
      let totalPriceOut = 0;

      for (let i = 0; i < order.items.length; i++) {
        const item = order.items[i];
        totalPriceIn += item.quantity * item.productID.priceIn;
        totalPriceOut += item.quantity * item.productID.priceOut;
      }
      return {
        totalPriceIn,
        totalPriceOut,
      };
    }
    for (let j = 0; j < data.length; j++) {
      const order = data[j];
      const stats = calculateOrderStats(order);
      const totalPriceIn = stats.totalPriceIn;
      const totalPriceOut = stats.totalPriceOut;
      const revenue = stats.totalPriceOut - stats.totalPriceIn + order.shippingFee;
      monthlyDataIn[i] = monthlyDataIn[i] || 0; // Kiểm tra dữ liệu đã tồn tại chưa
      monthlyDataOut[i] = monthlyDataOut[i] || 0;
      monthlyDataRevenue[i] = monthlyDataRevenue[i] || 0;
      monthlyDataIn[i] += totalPriceIn;
      monthlyDataOut[i] += totalPriceOut;
      monthlyDataRevenue[i] += revenue;
    }
  }
  for (let i = 0; i < 12; i++) {
    await Sale.updateMany(
      { month: i },
      {
        moneyIn: monthlyDataIn[i] || 0,
        moneyOut: monthlyDataOut[i] || 0,
        revenue: monthlyDataRevenue[i] || 0,
      }
    );
  }
}

setInterval(moneyUpdate, 10000);

//Trang doanh thu theo sản phẩm
app.get("/revenue", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0) {
      let data = await Warehouse.aggregate([
        { $group: { _id: "$productID", total: { $sum: "$quantityIn" } } },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "productList",
          },
        },
        { $sort: { "productList.productName":1 ,total: -1 } },
      ]);
      res.render("layouts/servers/sales/revenue", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        danhsach: data,
        VND,
        admin_role: req.session.admin_role,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Trang tổng doanh thu năm 2023
app.get("/salesbyyears", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 2) {
    let sale = await Sale.find();
    let monthlyDataIn = [];
    let monthlyDataOut = [];
    let monthlyData = [];
    for(let i = 0; i < 12; i++){
      monthlyDataIn.push(sale[i].moneyIn);
      monthlyDataOut.push(sale[i].moneyOut);
      monthlyData.push(sale[i].revenue);
    }
      res.render("layouts/servers/sales/salesbyyears", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        admin_role: req.session.admin_role,
        VND,
        monthlyData,
        monthlyDataOut,
        monthlyDataIn,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Trang doanh thu từng tháng
app.get("/monthlySale/:id", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0) {
      let month = req.params.id;
      let data = await Order.find({ month: month }).populate("items.productID");
      let convert = parseInt(month);
      let money = 0;
      for (let i = 0; i < data.length; i++) {
        money += data[i].total;
      }
      function calculateOrderStats(order) {
        let totalPriceIn = 0;
        let totalPriceOut = 0;
      
        for (let i = 0; i < order.items.length; i++) {
          const item = order.items[i];
          totalPriceIn += item.quantity * item.productID.priceIn;
          totalPriceOut += item.quantity * item.productID.priceOut;
        }
        return {
          totalPriceIn,
          totalPriceOut,
        };
      }
      const orderStats = [];
      for (let i = 0; i < data.length; i++) {
        const order = data[i];
        const stats = calculateOrderStats(order);
        const orderCode = order.orderCode;
        const timeOut = order.timeOut;
        const total = order.total;
        const totalPriceIn = stats.totalPriceIn;
        const totalPriceOut = stats.totalPriceOut;
        const shippingFee = order.shippingFee;
        const revenue = stats.totalPriceOut - stats.totalPriceIn + order.shippingFee;
        orderStats.push({
          orderCode,
          timeOut,
          total,
          totalPriceIn,
          totalPriceOut,
          shippingFee,
          revenue
        });
      }
      res.render("layouts/servers/sales/monthlySale", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        danhsach: orderStats,
        convert,
        VND,
        admin_role: req.session.admin_role,
        money,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Trang chi tiết danh sách bán hàng
app.get("/sales_detail/:orderCode", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 2) {
      let data = await Order.findOne({ orderCode: req.params.orderCode }).populate(
        "items.productID"
      );
      let code = data.couponCode;
      if (code == "Không") {
        let money = 0;
        let couponValue = 0;
        let couponType = 0;
        data.items.forEach(function (pid) {
          money += pid.productID.priceOut * pid.quantity;
        });
        res.render("layouts/servers/sales/sales_detail", {
          adminName: req.session.adminName,
          admin_id: req.session.admin_id,
          admin_role: req.session.admin_role,
          danhsach: data,
          VND,
          money,
          couponValue,
          couponType,
        });
      } else if (code != "Không") {
        let coupon = await Coupon.findOne({ couponCode: code });
        let couponValue = coupon.couponValue;
        let couponType = coupon.couponType;
        let money = 0;
        data.items.forEach(function (pid) {
          money += pid.productID.priceOut * pid.quantity;
        });
        res.render("layouts/servers/sales/sales_detail", {
          adminName: req.session.adminName,
          admin_id: req.session.admin_id,
          admin_role: req.session.admin_role,
          danhsach: data,
          VND,
          money,
          couponValue,
          couponType,
        });
      }
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Trang kho
app.get("/warehouse", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 1) {
      let data = await Warehouse.aggregate([
        { $group: { _id: "$productID", total: { $sum: "$quantityIn" } } },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "productList",
          },
        },
        { $sort: { "productList.productName": 1 } },
      ]);
      res.render("layouts/servers/warehouse/warehouse", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        danhsach: data,
        VND,
        admin_role: req.session.admin_role,
        success: req.flash("success"),
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Trang lịch sử nhập của sản phẩm trong kho 
app.get("/list_warehouse/:slug", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 1) {
      let product = await Product.findOne({slug: req.params.slug});
      let productID = product._id;
      let data = await Warehouse.find({ productID: productID })
        .populate("productID")
        .populate("created_by");
      res.render("layouts/servers/warehouse/list_warehouse", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        danhsach: data,
        VND,
        admin_role: req.session.admin_role,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Trang lịch sử bán của sản phẩm trong kho
app.get("/sale_history/:slug", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 2) {
      let product = await Product.findOne({slug: req.params.slug});
      let productID = product._id;
      const name = product.productName;
      const data = await Order.find(
        {
          $and: [{ "items._id": productID },{ orderStatus: { $lt: 4 } }],
        },
        { "items.$": 1 }
      );
      let money = 0;
      let order = [];
      for (let i = 0; i < data.length; i++) {
        let n = await Order.find({_id:data[i]._id});
        for(let j = 0; j < n.length; j++){
          order.push(n[j].orderCode);
        }
        data[i].items.forEach(function (id) {
          money += id.quantity;
        });
      }
      
      res.render("layouts/servers/warehouse/sale_history", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        admin_role: req.session.admin_role,
        danhsach: data,
        name,
        money,
        order,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Thêm số lượng cho 1 sản phẩm
app.get("/add_warehouse", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 1) {
      let data = await Product.find()
        .populate("categoryID")
        .populate("producerID");
      res.render("layouts/servers/warehouse/add_warehouse", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        danhsach: data,
        admin_role: req.session.admin_role,
        emptyError: req.flash("emptyError"),
        quantityError: req.flash("quantityError"),
        quantityED: req.flash("quantityED"),
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Lưu số lượng của sản phẩm
app.post("/save_warehouse", async (req, res) => {
  if (req.session.daDangNhap) {
    var productId = req.body.productID;
    var quantity = req.body.quantityIn;
    const data = collect(productId);
    const total = data.count();
    if (total == 1) {
      let error = 0;
      if (quantity == "") {
        req.flash("emptyError", "Vui lòng nhập số lượng!");
        error++;
      }
      if (quantity != "") {
        if (quantity <= 0 || quantity > 100) {
          req.flash("quantityError", "Số lượng lỗi!");
          let quantityED = quantity;
          req.flash("quantityED", quantityED);
          error++;
        }
      }
      if (error == 0) {
        var warehouse = Warehouse({
          productID: productId,
          quantityIn: quantity,
          created_by: req.session.admin_id,
          created_date: moment
            .tz(Date.now(), "Asia/Ho_Chi_Minh")
            .format("DD/MM/YYYY hh:mm a"),
        });
        await Product.updateOne(
          { _id: req.body.productID },
          { $inc: { productQuantity: req.body.quantityIn } }
        );
        await warehouse.save();
        req.flash("success", "Thêm thành công");
        res.redirect("/warehouse");
      } else {
        res.redirect("/add_warehouse");
      }
    } else {
      let error = 0;
      const warehouses = [];

      for (let i = 0; i < productId.length; i++) {
        if (quantity[i] === "") {
          req.flash("emptyError", "Vui lòng nhập số lượng!");
          error++;
        } else {
          const parsedQuantity = parseInt(quantity[i]);
          if (parsedQuantity <= 0 || parsedQuantity > 100) {
            req.flash("quantityError", "Số lượng lỗi!");
            req.flash("quantityED", quantity[i]);
            error++;
          }
        }

        if (error === 0) {
          const warehouse = {
            productID: productId[i],
            quantityIn: quantity[i],
            created_by: req.session.admin_id,
            created_date: moment
              .tz("Asia/Ho_Chi_Minh")
              .format("DD/MM/YYYY hh:mm a"),
          };

          warehouses.push(warehouse);

          await Product.updateMany(
            { _id: productId[i] },
            { $inc: { productQuantity: quantity[i] } }
          );
        }
      }

      if (error !== 0) {
        res.redirect("/add_warehouse");
      } else {
        try {
          await Warehouse.insertMany(warehouses);
          req.flash("success", "Thêm thành công");
          res.redirect("/warehouse");
        } catch (err) {
          console.error(err);
          req.flash("error", "Đã xảy ra lỗi trong quá trình lưu trữ sản phẩm.");
          res.redirect("/error-page");
        }
      }
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Trang mã giảm giá
app.get("/coupon", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 1) {
      let data = await Coupon.find();
      res.render("layouts/servers/coupon/coupon", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        danhsach: data,
        VND,
        admin_role: req.session.admin_role,
        success: req.flash("success"),
        error: req.flash("error"),
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Trang thêm mã giảm giá
app.get("/add_coupon", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 1) {
      res.render("layouts/servers/coupon/add_coupon", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        admin_role: req.session.admin_role,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Lưu mã giảm giá
app.post("/coupon_save", async (req, res) => {
  if (req.session.daDangNhap) {
    let check = await Coupon.findOne({ couponCode: req.body.couponCode });
    if (check) {
      req.flash("error", "MGG đã tồn tại");
      res.redirect("/coupon");
    } else {
      var coupon = Coupon({
        couponValue: req.body.couponValue,
        couponCode: req.body.couponCode,
        slug: slugify(req.body.couponCode, {replacement: '-',lower: true}),
        couponQuantity: req.body.couponQuantity,
        couponType: req.body.couponType,
        couponStatus: req.body.couponStatus,
        start_date: req.body.start_date,
        end_date: req.body.end_date,
      });
      coupon.save().then(function () {
        req.flash("success", "Thêm thành công");
        res.redirect("/coupon");
      });
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Trang cập nhật mã giảm giá
app.get("/edit_coupon/:slug", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 1) {
      let data = await Coupon.findOne({slug:req.params.slug});
      res.render("layouts/servers/coupon/edit_coupon", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        danhsach: data,
        admin_role: req.session.admin_role,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Lưu thông tin mã giảm giá sau khi sửa
app.post("/edit_coupon_save", async (req, res) => {
  if (req.session.daDangNhap) {
    Coupon.updateOne(
      { _id: req.body.couponId },
      {
        couponValue: req.body.couponValue,
        couponCode: req.body.couponCode,
        couponQuantity: req.body.couponQuantity,
        couponType: req.body.couponType,
        couponStatus: req.body.couponStatus,
        start_date: req.body.start_date,
        end_date: req.body.end_date,
      }
    ).then(function () {
      res.redirect("/coupon");
    });
  } else {
    res.redirect("/admin_login");
  }
});

//Trang quản lý tin tức
app.get("/admin_news", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 3) {
      let data = await News.find();
      res.render("layouts/servers/news/news", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        danhsach: data,
        VND,
        admin_role: req.session.admin_role,
        success: req.flash("success"),
        error: req.flash("error"),
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Trang thêm tin tức
app.get("/add_news", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 3) {
      res.render("layouts/servers/news/add_news", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        admin_role: req.session.admin_role,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Lưu tin tức
app.post("/news_save", async (req, res) => {
  if (req.session.daDangNhap) {
    upload(req, res, async function (err) {
      if (err instanceof multer.MulterError) {
        req.flash("error", "Lỗi Multer khi upload ảnh");
      } else if (err) {
        req.flash("error", "Lỗi bất ngờ xảy ra");
      } else {
        let check = await News.findOne({
          newsTitle: req.body.newsTitle,
        });
        if (check) {
          req.flash("error", "Tin đã tồn tại");
          res.redirect("/admin_news");
        } else {
          var news = News({
            newsTitle: req.body.newsTitle,
            slug: slugify(req.body.newsTitle, {replacement: '-',lower: true}),
            newsContent: req.body.newsContent,
            productImage: req.file.filename,
            newsStatus: 0,
            created_date: moment
              .tz(Date.now(), "Asia/Ho_Chi_Minh")
              .format("DD/MM/YYYY hh:mm a"),
            created_by: req.session.adminName,
          });
          news.save().then(function () {
            req.flash("success", "Thêm thành công");
            res.redirect("/admin_news");
          });
        }
      }
    });
  } else {
    res.redirect("/admin_login");
  }
});

//Trang sửa tin tức
app.get("/edit_news/:slug", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 3) {
      let data = await News.findOne({slug:req.params.slug});
      res.render("layouts/servers/news/edit_news", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        danhsach: data,
        admin_role: req.session.admin_role,
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Lưu tin tức sau khi sửa
app.post("/edit_news_save", async (req, res) => {
  if (req.session.daDangNhap) {
    upload(req, res, function (err) {
      //Không chọn file mới
      if (!req.file) {
        News.updateOne(
          { _id: req.body.newsId },
          {
            newsTitle: req.body.newsTitle,
            slug: slugify(req.body.newsTitle, {replacement: '-',lower: true}),
            newsContent: req.body.newsContent,
            newsProduct: req.body.newsProduct,
            newsStatus: req.body.newsStatus,
            updated_by: req.session.adminName,
            updated_date: moment
              .tz(Date.now(), "Asia/Ho_Chi_Minh")
              .format("DD/MM/YYYY hh:mm a"),
          }
        ).then(function () {
          req.flash("success", "Sửa thành công");
          res.redirect("/admin_news");
        });
        // Chọn file mới
      } else {
        if (err instanceof multer.MulterError) {
          req.flash("error", "Lỗi Multer khi upload ảnh");
        } else if (err) {
          req.flash("error", "Lỗi bất ngờ xảy ra");
        } else {
          News.updateOne(
            { _id: req.body.newsId },
            {
              newsTitle: req.body.newsTitle,
              slug: slugify(req.body.newsTitle, {replacement: '-',lower: true}),
              newsContent: req.body.newsContent,
              newsProduct: req.body.newsProduct,
              productImage: req.file.filename,
              newsStatus: req.body.newsStatus,
              updated_by: req.session.adminName,
              updated_date: moment
                .tz(Date.now(), "Asia/Ho_Chi_Minh")
                .format("DD/MM/YYYY hh:mm a"),
            }
          ).then(function () {
            req.flash("success", "Sửa thành công");
            res.redirect("/admin_news");
          });
        }
      }
    });
  } else {
    res.redirect("/admin_login");
  }
});

//Tự động cập nhật trạng thái của tin tức và mã giảm giá
async function updateStatus() {
  await Coupon.updateMany(
    { end_date: { $gt: new Date() }},
    { $set: { couponStatus: 1 } }
  )
  let date = moment().subtract(7, 'days').format("DD/MM/YYYY hh:mm a");
  await News.updateMany(
    { created_date: { $lte: date } },
    { $set: { newsStatus: 1 } }
  );
}
setInterval(updateStatus, 10000);
//Danh sách bình luận
app.get("/comment", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 3) {
      let comments = await Comment.find()
        .populate("userID")
        .populate("productID");
      const notAcceptComment = await Comment.find({ commentStatus: 0 }).count();
      const acceptComment = await Comment.find({ CommentStatus: 1 }).count();
      res.render("layouts/servers/comment/comment", {
        adminName: req.session.adminName,
        admin_id: req.session.admin_id,
        VND,
        admin_role: req.session.admin_role,
        comments,
        notAcceptComment,
        acceptComment,
        success: req.flash("success"),
        error: req.flash("error"),
      });
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Cập nhật trạng thái bình luận (Chưa duyệt -> Duyệt)
app.post("/update_commentStatus/:id", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 3) {
      await Comment.updateOne({ _id: req.params.id }, { commentStatus: 1 });
      req.flash("success", "Duyệt thành công");
      res.redirect("/comment");
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});

//Cập nhật trạng thái bình luận (Duyệt -> Huỷ duyệt)
app.post("/update_commentStatus_1/:id", async (req, res) => {
  if (req.session.daDangNhap) {
    let role = req.session.admin_role;
    if (role == 0 || role == 3) {
      await Comment.updateOne({ _id: req.params.id }, { commentStatus: 0 });
      req.flash("success", "Hủy duyệt thành công");
      res.redirect("/comment");
    } else {
      res.redirect("/admin_home");
    }
  } else {
    res.redirect("/admin_login");
  }
});
