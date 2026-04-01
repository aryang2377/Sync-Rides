import express from "express";
import path from "path";
import bcrypt from "bcrypt";
import method from "method-override";
import ejsMate from "ejs-mate";
import dotenv from "dotenv";
import Rating from "./models/rating.model.js";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import User from "./models/user.model.js";
import connectDB from "./db/sample.js";

import { fileURLToPath } from "url";

dotenv.config({ path: "./.env" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(cookieParser());

const globalMiddleware = (req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.isAuthenticated = Boolean(req.cookies?.token);
  next();
};

app.use(globalMiddleware);
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());

app.use((req, res, next) => {
  const token = req.cookies.token;

  if (token) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );  

      req.user = decoded;
      res.locals.user = decoded;

    } catch (err) {
      res.locals.user = null;
    }
  }
  else {
    res.locals.user = null;
  }

  next();
});
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(method("_method"));

app.engine("ejs", ejsMate);

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

const auth = (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.redirect("/login");
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded;

    next();

  } catch (err) {
    return res.redirect("/login");
  }
};

app.get("/", (req, res) => {
  res.render("listings/home");
});
app.get("/dashboard", auth, (req, res) => {
  if (req.user.role === "driver") {
    return res.render("listings/driver_dashboard", {
      mapToken: process.env.MAP_TOKEN || "",
    });
  }
  return res.render("listings/rider_dashboard", {
    mapToken: process.env.MAP_TOKEN || "",
  });
});

app.get("/login", (req, res) => {
  res.render("users/login");
});

app.get("/signup", (req, res) => {
  res.render("users/signup");
});

app.get("/about", (req, res) => {
  res.render("listings/about");
})

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

    res.redirect("/rider_dashboard");
  } catch (err) {
    next(err);
  }
});

// app.listen(3000, () => {
//   console.log("Server is running on http://localhost:3000");
// });

app.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    const ismatch = await bcrypt.compare(
      password, user.password
    )
    if (!ismatch) {
      return res.send("Wrong password");
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect("/rider_dashboard");
  } catch (err) {
    next(err);
  }
});



app.post("/review", auth, async (req, res) => {
  try {
    const { booking, driver, rating, comment } = req.body;

    const review = await Rating.create({
      booking,
      driver,
      rating,
      comment,
      reviewer: req.user.id,
    });
    res.status(201).json({
      success: true,
      review,
    });
  }
  catch (err) {
    res.status(500).json({
      message: err,
    });
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("token");

  res.redirect("/");
});












// export const loginUser = async (req, res) => {
//   const user = await User.findOne({
//     email: req.body.email
//   });

// single error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).render("error", {
    message: err.message,
  });
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
