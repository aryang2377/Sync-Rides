import express from "express"
import path from "path"
import method from "method-override"
import ejsMate from "ejs-mate"
import dotenv from "dotenv"
import connectDB from "./db/sample.js";

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "views"));
app.use(express.urlencoded({ extended: true }));
app.use(method("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(process.cwd(), "public")));

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

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
// app.listen(3000, () => {
//   console.log("Server is running on http://localhost:3000");
// });

dotenv.config({
  path: "./.env"
});

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 3000, () => {
      console.log(`Server is running at port:$ {process.env.PORT}`);
    })
  })
  .catch((err) => {
    console.log("MONGO Db connection failed", err);
  })
