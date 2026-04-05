import mongoose from "mongoose";

const tripSchema = new mongoose.Schema({

    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    pickup: {
        type: String,
        required: true
    },

    destination: {
        type: String,
        required: true
    },

    time: {
        type: Date,
        required: true
    },

    seats: {
        type: Number,
        default: 1,
        required: true
    },

    status: {
        type: String,
        enum: ["scheduled", "completed", "cancelled"],
        default: "scheduled"
    },

    passengers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ]

});

const Trip = mongoose.model("Trip", tripSchema);

export default Trip;