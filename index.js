import express from "express";
import path from "path";
import bcrypt from "bcrypt";
import method from "method-override";
import ejsMate from "ejs-mate";
import dotenv from "dotenv";
import Trip from "./models/trip.js";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import User from "./models/user.js";
import Ride from "./models/rides.js";
import Booking from "./models/booking.js";
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

app.get("/", (req, res) => {
  res.render("listings/home");
});

app.get("/dashboard", async (req, res) => {
  if (!res.locals.user) {
    return res.redirect("/login");
  }

  const userId = res.locals.user._id;

  let trips = [];

  trips = await Trip.find({
    driver: { $ne: userId },
  }).populate("driver");

  const now = new Date();

  /* TOTAL TRIPS */
  const createdTrips = await Trip.countDocuments({
    driver: userId,
  });

  const joinedTrips = await Trip.countDocuments({
    passengers: userId,
  });

  const totalTrips = createdTrips + joinedTrips;

  /* FIXED UPCOMING COUNT */

  // upcoming trips (created or joined)
  const upcomingTripCount = await Trip.countDocuments({
    $or: [
      { driver: userId },
      { passengers: userId }
    ],
    time: { $gte: now }
  });

  // upcoming bookings (rides joined)
  const upcomingBookingCount = await Booking.countDocuments({
    rider: userId,
    status: { $in: ["pending", "confirmed"] }
  });

  // FINAL UPCOMING VALUE
  const upcomingTrips = upcomingTripCount + upcomingBookingCount;

  /* FIXED NEXT RIDE */

  const nextRide = await Ride.findOne({
    departure_time: { $gte: now },
    status: { $ne: "cancelled" }
  })
    .populate("driver", "fullname")
    .sort({ departure_time: 1 });

  if (res.locals.user.role === "driver") {

    const driverId = res.locals.user._id;

    const driverRides = await Ride.find({
      driver: driverId
    }).select("_id");


    const rideIds = driverRides.map(r => r._id);


    const incomingRequests = await Booking.find({
      ride: { $in: rideIds },
      status: "pending"
    })
      .populate("rider", "fullname")
      .populate("ride")

    // TOTAL RIDES
    const totalRides = await Booking.countDocuments({
      ride: { $in: rideIds },
      status: { $in: ["confirmed", "completed"] }
    });

    return res.render("listings/driver_dashboard", {
      mapToken: process.env.MAP_TOKEN || "",
      incomingRequests,
      totalRides
    });
  }
  else {
    try {
      console.log("Fetching rides for rider:", res.locals.user._id);

      // Get all rides user has already booked
      const userBookings = await Booking.find({
        rider: res.locals.user._id,
        status: { $in: ["pending", "confirmed"] },
      }).select("ride");

      // Convert to Set for fast lookup
      const bookedRideIds = new Set(
        userBookings.map((booking) => booking.ride.toString())
      );

      console.log("User has booked rides:", [...bookedRideIds]);

      // Fetch available rides
      const availableRides = await Ride.find({
        status: "pending",
        available_seats: { $gt: 0 },
        departure_time: { $gte: new Date() },
      })
        .populate("driver", "fullname")
        .sort({ departure_time: 1 })
        .limit(10);

      // Attach booking status
      const ridesWithStatus = availableRides.map((ride) => ({
        ...ride.toObject(),
        isBookedByUser: bookedRideIds.has(ride._id.toString()),
      }));

      // console.log("Available rides found:", availableRides.length);

      // availableRides.forEach((ride) => {
      //   console.log(
      //     `Ride ${ride._id}: ${ride.origin.address} → ${ride.destination.address}, seats: ${ride.available_seats}`
      //   );
      // });

      return res.render("listings/rider_dashboard", {
        trips,
        totalTrips,
        upcomingTrips,
        nextRide,
        mapToken: process.env.MAP_TOKEN || "",
        availableRides: ridesWithStatus,
      });
    } catch (error) {
      console.error("Error fetching rides:", error);

      return res.render("listings/rider_dashboard", {
        trips,
        totalTrips,
        upcomingTrips,
        nextRide,
        mapToken: process.env.MAP_TOKEN || "",
        availableRides: [],
      });
    }
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

const requireAuth = (req, res, next) => {
  if (!res.locals.user) {
    return res.redirect("/login");
  }
  next();
};

app.get("/about", (req, res) => {
  res.render("listings/about");
});

app.get("/bookings", requireAuth, async (req, res, next) => {
  if (!res.locals.user) {
    return res.redirect("/login");
  }

  try {
    const user = res.locals.user;
    if (user.role === "driver") {
      // For drivers, show offered rides with bookings
      const driverRides = await Ride.find({ driver: user._id }).sort({
        departure_time: -1,
      });
      const rideIds = driverRides.map((ride) => ride._id);
      const rideBookings = await Booking.find({ ride: { $in: rideIds } })
        .populate("rider", "fullname phone")
        .sort({ createdAt: -1 });

      // Group bookings by ride
      const bookingsByRide = {};
      rideBookings.forEach((booking) => {
        if (!bookingsByRide[booking.ride]) {
          bookingsByRide[booking.ride] = [];
        }
        bookingsByRide[booking.ride].push(booking);
      });

      res.render("listings/driver_booking", {
        rides: driverRides,
        bookingsByRide,
      });
    } else {
      // For riders, show bookings
      const bookings = await Booking.find({
        rider: user._id,
        status: { $in: ["completed", "cancelled"] },
      })
        .populate("driver", "fullname vehicle_model phone")
        .populate("ride");

      const summary = {
        total: bookings.length,
        upcoming: bookings.filter(
          (b) => b.status === "pending" || b.status === "confirmed"
        ).length,
        completed: bookings.filter((b) => b.status === "completed").length,
        cancelled: bookings.filter((b) => b.status === "cancelled").length,
      };

      const userId = res.locals.user._id;

      const trips = await Trip.find({
        $or: [{ driver: userId }, { passengers: userId }],
      })
        .populate("driver")
        .sort({ time: 1 });
      const now = new Date();

      const scheduledTrips = [];
      const completedTrips = [];
      const cancelledTrips = [];

      trips.forEach((trip) => {
        if (trip.status === "cancelled") {
          cancelledTrips.push(trip);
        } else if (trip.time < now) {
          completedTrips.push(trip);
        } else {
          scheduledTrips.push(trip);
        }
      });

      res.render("listings/rider_booking", {
        scheduledTrips,
        completedTrips,
        cancelledTrips,
      });
    }
  } catch (err) {
    next(err);
  }
});

//rider..
app.post("/bookings/:bookingId/update", requireAuth, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).populate(
      "ride"
    );
    if (!booking) {
      return res.status(404).render("error", { message: "Booking not found" });
    }

    const user = res.locals.user;
    if (!booking.rider.equals(user._id) && !booking.driver.equals(user._id)) {
      return res.status(403).render("error", { message: "Not authorized" });
    }

    const newSeats = Number(req.body.seats_booked);
    if (!Number.isInteger(newSeats) || newSeats < 1) {
      return res.status(400).render("error", { message: "Invalid seat count" });
    }

    const ride = booking.ride;
    const seatDiff = newSeats - booking.seats_booked;
    if (seatDiff > 0 && ride.available_seats < seatDiff) {
      return res
        .status(400)
        .render("error", { message: "Not enough seats available" });
    }

    booking.seats_booked = newSeats;
    booking.total_fare = newSeats * (ride.price_per_seat || 0);
    await booking.save();

    ride.available_seats -= seatDiff;
    if (ride.available_seats < 0) {
      ride.available_seats = 0;
    }
    if (ride.available_seats === 0 && ride.status !== "cancelled") {
      ride.status = "completed";
    }
    await ride.save();

    res.redirect("/bookings");
  } catch (err) {
    next(err);
  }
});

app.post("/bookings/:bookingId/cancel", requireAuth, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).populate(
      "ride"
    );
    if (!booking) {
      return res.status(404).render("error", { message: "Booking not found" });
    }

    const user = res.locals.user;
    if (!booking.rider.equals(user._id) && !booking.driver.equals(user._id)) {
      return res.status(403).render("error", { message: "Not authorized" });
    }

    if (booking.status === "cancelled" || booking.status === "completed") {
      return res.redirect("/bookings");
    }

    booking.status = "cancelled";
    await booking.save();

    const ride = booking.ride;
    ride.available_seats += booking.seats_booked;
    if (ride.status === "completed") {
      ride.status = "active";
    }
    await ride.save();

    res.redirect("/bookings");
  } catch (err) {
    next(err);
  }
});

//driver
app.post(
  "/bookings/:bookingId/confirm",
  requireAuth,
  async (req, res, next) => {
    try {
      const booking = await Booking.findById(req.params.bookingId).populate(
        "ride"
      );
      if (!booking) {
        return res
          .status(404)
          .render("error", { message: "Booking not found" });
      }

      const user = res.locals.user;
      if (!booking.driver.equals(user._id)) {
        return res
          .status(403)
          .render("error", { message: "Only the driver can confirm bookings" });
      }

      booking.status = "confirmed";
      await booking.save();

      res.redirect("/bookings");
    } catch (err) {
      next(err);
    }
  }
);

app.post("/bookings/:bookingId/delete", requireAuth, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).populate(
      "ride"
    );
    if (!booking) {
      return res.status(404).render("error", { message: "Booking not found" });
    }

    const user = res.locals.user;
    if (!booking.rider.equals(user._id) && !booking.driver.equals(user._id)) {
      return res.status(403).render("error", { message: "Not authorized" });
    }

    if (booking.status !== "cancelled") {
      const ride = booking.ride;
      ride.available_seats += booking.seats_booked;
      if (ride.status === "completed") {
        ride.status = "active";
      }
      await ride.save();
    }

    await booking.deleteOne();
    res.redirect("/bookings");
  } catch (err) {
    next(err);
  }
});

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

    res.redirect("/dashboard");
  } catch (err) {
    next(err);
  }
});

// Create trip route for drivers to offer rides
app.post("/create-trip", async (req, res, next) => {
  try {
    const { route, seats, departure, category } = req.body;

    // console.log("Create trip request:", {
    //   route,
    //   seats,
    //   departure,
    //   category,
    //   driver: res.locals.user._id,
    // });

    // Parse the route (e.g., "Jaipur to Delhi" -> from: "Jaipur", to: "Delhi")
    const routeParts = route.toLowerCase().split(" to ");
    const from = routeParts[0]?.trim();
    const to = routeParts[1]?.trim();

    if (!from || !to) {
      return res.status(400).render("error", {
        message: "Invalid route format. Use 'From to To' format.",
      });
    }

    const newRide = new Ride({
      driver: res.locals.user._id,
      origin: {
        address: from,
        coordinates: { lat: 0, lng: 0 }, // Will be updated with geocoding later
      },
      destination: {
        address: to,
        coordinates: { lat: 0, lng: 0 }, // Will be updated with geocoding later
      },
      departure_time: new Date(departure), // Flatpickr sends in Y-m-d H:i format which Date() can parse
      total_seats: parseInt(seats),
      available_seats: parseInt(seats),
      price_per_seat: 0, // Can be calculated based on distance later
      status: "pending",
    });

    const savedRide = await newRide.save();
    console.log("Ride created successfully:", savedRide._id);

    res.redirect("/dashboard");
  } catch (err) {
    console.error("Error creating trip:", err);
    next(err);
  }
});

// Edit ride route
app.get("/rides/:rideId/edit", requireAuth, async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) {
      return res.status(404).render("error", { message: "Ride not found" });
    }
    if (ride.driver.toString() !== res.locals.user._id.toString()) {
      return res
        .status(403)
        .render("error", { message: "You can only edit your own rides" });
    }
    res.render("listings/edit_ride", {
      ride,
      mapToken: process.env.MAP_TOKEN || "",
    });
  } catch (err) {
    next(err);
  }
});

// Update ride route
app.put("/rides/:rideId", requireAuth, async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) {
      return res.status(404).render("error", { message: "Ride not found" });
    }
    if (ride.driver.toString() !== res.locals.user._id.toString()) {
      return res
        .status(403)
        .render("error", { message: "You can only edit your own rides" });
    }

    const { route, seats, departure, category } = req.body;
    const routeParts = route.toLowerCase().split(" to ");
    const from = routeParts[0]?.trim();
    const to = routeParts[1]?.trim();

    if (!from || !to) {
      return res.status(400).render("error", {
        message: "Invalid route format. Use 'From to To' format.",
      });
    }

    ride.origin.address = from;
    ride.destination.address = to;
    ride.departure_time = new Date(departure);
    ride.total_seats = parseInt(seats);
    ride.available_seats = Math.min(ride.available_seats, parseInt(seats)); // Adjust if seats increased
    ride.category = category;

    await ride.save();
    res.redirect("/bookings");
  } catch (err) {
    next(err);
  }
});

// Delete ride route
app.delete("/rides/:rideId", requireAuth, async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) {
      return res.status(404).render("error", { message: "Ride not found" });
    }
    if (ride.driver.toString() !== res.locals.user._id.toString()) {
      return res
        .status(403)
        .render("error", { message: "You can only delete your own rides" });
    }

    // Check if there are active bookings
    const activeBookings = await Booking.find({
      ride: ride._id,
      status: { $in: ["pending", "confirmed"] },
    });
    if (activeBookings.length > 0) {
      return res.status(400).render("error", {
        message: "Cannot delete ride with active bookings",
      });
    }

    await ride.deleteOne();
    res.redirect("/bookings");
  } catch (err) {
    next(err);
  }
});

// Join ride route for riders to book seats
app.post("/join-ride/:rideId", async (req, res, next) => {
  try {
    const rideId = req.params.rideId;
    const riderId = res.locals.user._id;

    console.log(`Join ride attempt: rideId=${rideId}, riderId=${riderId}`);

    // Check if ride exists and has available seats
    const ride = await Ride.findById(rideId);
    if (!ride) {
      console.log("Ride not found");
      return res.status(404).render("error", { message: "Ride not found" });
    }

    console.log(`Ride found: available_seats=${ride.available_seats}`);

    if (ride.available_seats <= 0) {
      console.log("No seats available");
      return res.status(400).render("error", { message: "No seats available" });
    }

    // Check if rider already booked this ride
    const existingBooking = await Booking.findOne({
      ride: rideId,
      rider: riderId,
      status: { $in: ["pending", "confirmed"] },
    });

    if (existingBooking) {
      console.log("User already booked this ride");
      return res
        .status(400)
        .render("error", { message: "You have already booked this ride" });
    }

    // Create booking
    const booking = new Booking({
      ride: rideId,
      rider: riderId,
      driver: ride.driver,
      seats_booked: 1, // For now, book 1 seat
      total_fare: ride.price_per_seat || 0, // Will be calculated properly later
      status: "pending",
    });

    await booking.save();
    console.log("Booking created successfully");

    // Update available seats
    const oldSeats = ride.available_seats;
    ride.available_seats -= 1;
    await ride.save();
    console.log(
      `Available seats updated: ${oldSeats} -> ${ride.available_seats}`
    );

    res.redirect("/dashboard");
  } catch (err) {
    console.error("Error joining ride:", err);
    next(err);
  }
});

app.post("/trips", async (req, res) => {
  if (!res.locals.user) {
    return res.redirect("/login");
  }
  const { pickup, destination, time } = req.body;

  const newTrip = new Trip({
    driver: res.locals.user._id,

    pickup,
    destination,
    time: new Date(time),
    seats: res.locals.user.seats || 1,
  });

  await newTrip.save();

  res.redirect("/dashboard");
});

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
