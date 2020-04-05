//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

//jshint esversion:6
const day1Content = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";

const posts = [{
  title: "Day 1",
  content: day1Content
}];

app.get("/", function(req, res) {
  res.render("home", {
    posts: posts
  });
});

app.get("/about", function(req, res) {
  res.render("about");
});

app.get("/contact", function(req, res) {
  res.render("contact");
});

app.get("/compose", function(req, res) {
  res.render("compose");
});

app.post("/compose", function(req, res) {

  const blogpost = {
    title: req.body.postTitle,
    content: req.body.postBody
  };
  posts.push(blogpost);
  res.redirect("/");
});

app.get("/posts/:postId", function(req, res) {

  posts.forEach(function(post) {

    const lowerCasePostTitle = _.lowerCase(post.title)
    const lowerCasePostId = _.lowerCase(req.params.postId)

    if (lowerCasePostId === lowerCasePostTitle) {
      res.render("post", {
        thisTitle: post.title,
        thisContent: post.content
      })}
  });
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
