import express from "express";
import path from "path";
import bcrypt from "bcrypt";
import method from "method-override";
import ejsMate from "ejs-mate";
import dotenv from "dotenv";

import User from "./db/userSchema.js";
import connectDB from "./db/sample.js";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(method("_method"));

app.engine("ejs", ejsMate);

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
app.post("/signup", async (req, res) => {
  try {
    // console.log(req.body);
    const { fullname, email, phone, password, role, vehicle_model, seats } = req.body;
    const hashPass = await bcrypt.hash(password, 10);
    // console.log(hashPass);
    const newUser = new User({
      fullname,
      email,
      phone,
      password: hashPass,
      role,
      vehicle_model,
      seats,
    });

    await newUser.save();

    res.send("User registered successfully!");
  } catch (err) {
    console.log(err);
    res.redirect("/signup");
  }
});
// app.listen(3000, () => {
//   console.log("Server is running on http://localhost:3000");
// });

dotenv.config({
  path: "./.env",
});

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 3000, () => {
      console.log(`Server is running at http://localhost:3000`);
    });
  })
  .catch((err) => {
    console.log("MONGO DB connection failed", err);
  });
