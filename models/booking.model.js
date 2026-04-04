import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  ride: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ride",
    required: true,
  },
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  seats_booked: {
    type: Number,
    required: true,
    min: 1,
  },
  total_fare: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "confirmed", "cancelled", "completed"],
    default: "pending",
  },
  pickup_address: {
    type: String,
  },
  dropoff_address: {
    type: String,
  },
});

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;