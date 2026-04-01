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

const globalMiddleware = async (req, res, next) => {
  res.locals.currentPath = req.path;

  try {
    const token = req.cookies?.token;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.id);

      res.locals.isAuthenticated = true;
      res.locals.user = user;
    } else {
      res.locals.isAuthenticated = false;
      res.locals.user = null;
    }
  } catch {
    res.locals.isAuthenticated = false;
    res.locals.user = null;
  }

  next();
};

app.use(globalMiddleware);
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(method("_method"));

app.engine("ejs", ejsMate);

// const auth = (req, res, next) => {
//   try {
//     const token = req.cookies.token;

//     if (!token) {
//       return res.redirect("/login");
//     }

//     const decoded = jwt.verify(
//       token,
//       process.env.JWT_SECRET
//     );

//     req.user = decoded;

//     next();

//   } catch (err) {
//     return res.redirect("/login");
//   }
// };

app.get("/", (req, res) => {
  res.render("listings/home");
});
app.get("/dashboard", (req, res) => {
  if (!res.locals.user) {
    return res.redirect("/login");
  }
  if (res.locals.user.role === "driver") {
    return res.render("listings/driver_dashboard", {
      mapToken: process.env.MAP_TOKEN || "",
    });
  }
  else {
    return res.render("listings/rider_dashboard", {
      mapToken: process.env.MAP_TOKEN || "",
    });
  }
});

app.get("/login", (req, res) => {
  res.render("users/login");
});

app.get("/signup", (req, res) => {
  res.render("users/signup");
});

app.post("/signup", async (req, res, next) => {
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

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect("/dashboard");
  } catch (err) {
    next(err);
  }
});

app.get("/about", (req, res) => {
  res.render("listings/about");
});

// app.listen(3000, () => {
//   console.log("Server is running on http://localhost:3000");
// });

app.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .render("error", { message: "Invalid email or password" });
    }

    const ismatch = await bcrypt.compare(password, user.password);
    if (!ismatch) {
      return res
        .status(401)
        .render("error", { message: "Invalid email or password" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    if (res.locals.user.role === "driver") {
      return res.redirect("/driver_dashboard");
    }
    else {
      return res.redirect("/rider_dashboard");
    }
  } catch (err) {
    next(err);
  }
});

// const createReview = async (req, res) => {
//   try {
//     const { booking, driver, rating, comment } = req.body;

//     const review = await Review.create({
//       booking,
//       driver,
//       rating,
//       comment,
//       reviewer: driver,
//     });
//     res.status(201).json({
//       success: true,
//       review,
//     });
//   } catch (err) {
//     res.status(500).json({
//       message: err,
//     });
//   }
// };

app.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/");
});

// 404 → convert to error
app.use((req, res, next) => {
  const err = new Error("Page Not Found");
  err.status = 404;
  next(err);
});

// single error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).render("error", {
    message: err.message || "Something went wrong",
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
