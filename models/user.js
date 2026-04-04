import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  fullname: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["driver", "rider"],
    required: true,
  },
  vehicle_model: {
    type: String,
    required: function () {
      return this.role === "driver";
    },
  },
  seats: {
    type: Number,
    required: function () {
      return this.role === "driver";
    },
    min: 1,
    max: 8,
  },
});

const User = mongoose.model("User", userSchema);

export default User;
