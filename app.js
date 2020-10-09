//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const app = express();
const date = require(__dirname + "/date.js");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

app.set("view engine", "ejs");
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(express.static("public"));

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

const uri = process.env.ATLAS_URI;
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set("useCreateIndex", true);

const blogPostSchema = {
  date: String,
  title: String,
  content: String,
  userId: String,
};

const BlogPost = mongoose.model("BlogPost", blogPostSchema);

const userSchema = mongoose.Schema({
  username: {
    type: String,
  },
  googleId: {
    type: String,
  },
  password: {
    type: String,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  authorName: {
    type: Object,
  },
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL:
        "https://protected-hamlet-37960.herokuapp.com/auth/google/dailyjournal",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      // console.log(profile);

      User.findOrCreate(
        {
          googleId: profile.id,
          username: profile.emails[0].value,
          authorName: profile.name,
        },
        function (err, user) {
          return cb(err, user);
        }
      );
    }
  )
);

let navArr = [];

app.get("/", function (req, res) {
  if (req.isAuthenticated()) {
    navArr.push({ item: "LOG OUT" });
    res.redirect("/userhome");
  } else {
    res.render("welcome", { navArr });
  }
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/dailyjournal",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    res.redirect("/userhome");
  }
);

app.get("/register", function (req, res) {
  res.render("register", { navArr });
});

app.get("/login", function (req, res) {
  res.render("login", { navArr });
});

app.get("/logout", function (req, res) {
  req.logout();
  navArr = [];
  res.redirect("/");
});

app.get("/userhome", function (req, res) {
  if (req.isAuthenticated()) {
    User.findById(req.user.id, function (err, foundUser) {
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
          navArr.push({ item: "LOG OUT" });
          BlogPost.find({ userId: foundUser._id })
            .collation({ locale: "en" })
            .sort({ date: -1 })
            .exec(function (err, posts) {
              res.render("userHome", { posts, navArr });
            });
        }
      }
    });
  } else {
    res.redirect("/");
  }
});

app.get("/compose", function (req, res) {
  if (req.isAuthenticated()) {
    navArr.push({ item: "LOG OUT" });
    res.render("compose", { navArr });
  } else {
    res.redirect("/");
  }
});

app.get("/posts/:postId", function (req, res) {
  const requestedPostId = req.params.postId;

  if (req.isAuthenticated()) {
    navArr.push({ item: "LOG OUT" });
    BlogPost.findOne({ _id: requestedPostId }, function (err, post) {
      res.render("post", {
        thisTitle: post.title,
        thisContent: post.content,
        post,
        navArr,
      });
    });
  } else {
    res.redirect("/");
  }
});

app.get("/about", function (req, res) {
  if (req.isAuthenticated()) {
    navArr.push({ item: "LOG OUT" });
  }
  res.render("about", { navArr });
});

app.post("/register", function (req, res) {
  let errors = [];
  if (req.body.password.length < 6) {
    errors.push({ msg: "Password should be at least 6 characters" });
  }

  if (errors.length > 0) {
    res.render("register", { errors, navArr });
  } else {
    User.register({ username: req.body.username }, req.body.password, function (err, user) {
      if (err) {
        errors.push({ msg: err.message });
        res.render("register", { errors, navArr });
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/userhome");
        });
      }
    });
  }
});

app.post("/login", function (req, res) {
  let errors = [];

  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  User.findOne({ username: req.body.username }, function (err, user) {
    if (err) {
      console.log(err);
    } if (!user) {
      errors.push({ msg: "This email has not been registered" });
      res.render("login", { errors, navArr });
    } else {
      req.login(user, function (err) {
        if (err) {
          console.log(err);
        } else {
          passport.authenticate("local", { failureRedirect: '/login' })(req, res, function () {
            res.redirect("/userhome");
          });
        }
      });
    }
  })
}
);

app.post("/compose", function (req, res) {
  const time = date.getTime();

  const post = new BlogPost({
    date: time,
    title: req.body.postTitle,
    content: req.body.postBody,
    userId: req.user.id,
  });

  User.findById(req.user.id, function (err, foundUser) {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        post.save(function (err) {
          if (!err) {
            res.redirect("/");
          }
        });
      }
    }
  });
});

app.post("/delete", function (req, res) {
  const deletedPost = req.body.deletedPost;
  BlogPost.deleteOne({ _id: deletedPost }, function (err) {
    if (!err) {
      res.redirect("/");
    }
  });
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function () {
  console.log("Server has started successfully.");
});