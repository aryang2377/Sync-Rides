import mongoose from "mongoose";
const driverSchema = new mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    licenseNumber: {
        type: String,
        required: true
    },

    vehicleNumber: {
        type: String,
        required: true
    },

    vehicleType: {
        type: String,
        enum: ["car", "bike"]
    },

    fuelSaved: {
        type: Number,
        default: 0
    },

    todayEarnings: {
        type: Number,
        default: 0
    }

}, 
);

const Driver = mongoose.model("Driver", driverSchema);
export default Driver;