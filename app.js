//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));
mongoose.connect('mongodb://localhost:27017/blogDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const blogPostSchema = {
  date: Date,
  title: String,
  content: String
};

const BlogPost = mongoose.model("BlogPost", blogPostSchema);

// const welcomeSchema = {
//   title: String,
//   content: String
// }
//
// const WelcomePost = mongoose.model("WelcomePost", welcomeSchema);
//
// const welcome = new WelcomePost({
//   title: "Welcome to daily journal",
//   content: "Click the compose button to start your first journal."
// })


app.get("/", function(req, res) {
    BlogPost.find().collation({locale: "en"}).sort({date: -1}).exec(function(err, posts) {
      res.render("home", {posts: posts});
    });
  });

app.get("/compose", function(req, res) {
  res.render("compose");
});

app.post("/compose", function(req, res) {
  const post = new BlogPost({
    date: Date.now(),
    title: req.body.postTitle,
    content: req.body.postBody
  })
  post.save(function(err){
    if(!err){
      res.redirect("/");
    }
  });
});

app.get("/posts/:postId", function(req, res) {

  const requestedPostId = req.params.postId;

  BlogPost.findOne({_id: requestedPostId}, function(err, post){
    res.render("post", {
      thisTitle: post.title,
      thisContent: post.content
    })
  })

});

app.get("/about", function(req, res) {
  res.render("about");
});

app.get("/contact", function(req, res) {
  res.render("contact");
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
