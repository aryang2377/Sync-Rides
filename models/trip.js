import mongoose from "mongoose";
const tripSchema=new mongoose.Schema({
        driver:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"user",
            required:true
        },
        pickup:{
            type:String,
            required:true
        },
        destination:{
            type:String,
            required:true
        },
        time:{
            type:Date,
            required:true
        },
        Seats:{
            type:Number,
            default:1,
            required:true
        },
        passengers:[{
            type:mongoose.Schema.Types.ObjectId,
            ref:"user"
        }
    ]
    },
);

const Trip = mongoose.model("Trip", tripSchema);
export default Trip;