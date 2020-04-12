//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const app = express();
const date = require(__dirname + "/date.js");

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
  date: String,
  title: String,
  content: String
};

const BlogPost = mongoose.model("BlogPost", blogPostSchema);

app.get("/", function(req, res) {
    BlogPost.find().collation({locale: "en"}).sort({date: -1}).exec(function(err, posts) {
      res.render("home", {posts: posts});
    });
  });

app.get("/compose", function(req, res) {
  res.render("compose");
});

app.post("/compose", function(req, res) {
  const time = date.getTime();

  const post = new BlogPost({
    date: time,
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
      thisContent: post.content,
      post: post
    })
  })

});

app.post("/delete", function(req, res){
  const deletedPost = req.body.deletedPost
  BlogPost.deleteOne({_id: deletedPost}, function(err){
    if(!err) {
      res.redirect("/");
    }
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
