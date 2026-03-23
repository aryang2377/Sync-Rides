const express = require("express");
const path = require("path");
const method = require("method-override");
const ejsMate = require("ejs-mate");
const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(method("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("listings/home");
});
app.get("/dashboard", (req, res) => {
  res.render("listings/dashboard");
});
app.get("/login", (req, res) => {
  res.render("users/login");
});
app.get("/signup", (req, res) => {
  res.render("users/signup");
});
app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
