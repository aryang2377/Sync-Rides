import express from "express";
import path from "path";
import bcrypt from "bcrypt";
import method from "method-override";
import ejsMate from "ejs-mate";
import dotenv from "dotenv";
import Rating from "./models/rating.model.js";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken"
import User from "./models/user.model.js";
import connectDB from "./db/sample.js";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());
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
  res.render("listings/dashboard", {
    mapToken: process.env.MAP_TOKEN || "",
  });
});
app.get("/login", (req, res) => {
  res.render("users/login");
});
app.get("/signup", (req, res) => {
  res.render("users/signup");
});
app.post("/signup", async (req, res) => {
  try {
    const { fullname, email, phone, password, role, vehicle_model, seats } =
      req.body;
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

    res.redirect("/dashboard");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/about", (req, res) => {
  res.render("listings/about");
});

// app.listen(3000, () => {
//   console.log("Server is running on http://localhost:3000");
// });


app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    const ismatch = await bcrypt.compare(
      password, user.password
    )
     if (!ismatch) {
      return res.send("Wrong password");
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.redirect("/dashboard");

  } catch (err) {
    res.send(err.message);
  }
});



const createReview = async (req, res) => {
  try {
    const { booking, driver, rating, comment } = req.body;

    const review = await Rating.create({
      booking,
      driver,
      rating,
      comment,
      reviewer: driver,
    });
    res.status(201).json({
      success: true,
      review,
    });
  } catch (err) {
    res.status(500).json({
      message: err
    });
  }
}














// export const loginUser = async (req, res) => {
//   const user = await User.findOne({
//     email: req.body.email
//   });

//   const token = jwt.sign(
//     { id: user._id },
//     process.env.JWT_SECRET,
//     { expiresIn: "7d" }
//   );

//   res.cookie("token", token, {
//     httpOnly: true,
//     maxAge: 7 * 24 * 60 * 60 * 1000
//   });

//   res.json({
//     message: "Login successful"
//   });
// };








































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
