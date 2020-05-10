//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const app = express();
const date = require(__dirname + "/date.js");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose")
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require('mongoose-findorcreate');

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

const uri = process.env.ATLAS_URI;
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set("useCreateIndex", true);

const blogPostSchema = {
  date: String,
  title: String,
  content: String,
  userId: String
};

const BlogPost = mongoose.model("BlogPost", blogPostSchema);

const userSchema = mongoose.Schema({
  username: String,
  password: String
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

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "https://protected-hamlet-37960.herokuapp.com/auth/google/dailyjournal",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
  function (accessToken, refreshToken, profile, cb) {
    // console.log(profile);

    User.findOrCreate({ username: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function (req, res) {
  if (req.isAuthenticated()) {
    res.redirect("/userhome");
  } else {
    res.render("home");
  }
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get("/auth/google/dailyjournal",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    res.redirect("/userhome");
  });

app.get("/register", function (req, res) {
  res.render("register");
});

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

app.get("/userhome", function (req, res) {
  if (req.isAuthenticated()) {
    User.findById(req.user.id, function (err, foundUser) {
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
          BlogPost.find({ userId: foundUser._id }).collation({ locale: "en" }).sort({ date: -1 }).exec(function (err, posts) {
            res.render("userHome", { posts: posts });
          })
        }
      }
    })
  } else {
    res.redirect("/")
  }
});

app.get("/compose", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("compose");
  } else {
    res.redirect("/")
  }
});

app.get("/posts/:postId", function (req, res) {
  const requestedPostId = req.params.postId;

  if (req.isAuthenticated()) {
    BlogPost.findOne({ _id: requestedPostId }, function (err, post) {
      res.render("post", {
        thisTitle: post.title,
        thisContent: post.content,
        post: post
      })
    })
  } else {
    res.redirect("/")
  }
});

app.get("/about", function (req, res) {
  res.render("about");
});

app.post("/register", function (req, res) {
  User.register({ username: req.body.username }, req.body.password, function (err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/userhome");
      })
    }
  })
});

app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });
  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/userhome")
      })
    }
  })
});

app.post("/compose", function (req, res) {
  const time = date.getTime();

  const post = new BlogPost({
    date: time,
    title: req.body.postTitle,
    content: req.body.postBody,
    userId: req.user.id
  })

  User.findById(req.user.id, function (err, foundUser) {
    if (err) {
      console.log(err)
    } else {
      if (foundUser) {
        post.save(function (err) {
          if (!err) {
            res.redirect("/");
          }
        });
      }
    }
  })
});

app.post("/delete", function (req, res) {
  const deletedPost = req.body.deletedPost
  BlogPost.deleteOne({ _id: deletedPost }, function (err) {
    if (!err) {
      res.redirect("/");
    }
  })
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function () {
  console.log("Server has started successfully.");
});
