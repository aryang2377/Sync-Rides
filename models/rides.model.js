import mongoose from "mongoose";

const rideSchema = new mongoose.Schema({
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    origin: {
        address: { type: String, required: true },
        coordinates: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },
        },
    },
    destination: {
        address: { type: String, required: true },
        coordinates: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },
        },
    },
    departure_time: {
        type: Date,
        required: true,
    },
    total_seats: {
        type: Number,
        required: true,
    },
    available_seats: {
        type: Number,
        required: true,
    },
    price_per_seat: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ["pending", "active", "completed", "cancelled"],
        default: "pending",
    },
});

const Ride = mongoose.model("Ride", rideSchema);
export default Ride;