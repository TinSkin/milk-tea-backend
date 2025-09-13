import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        //! Console log MONGO_URI variable to check if it's being read correctly
        console.log(".env => MONGO_URI: ", process.env.MONGO_URI)
        const mongo_connect = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${mongo_connect.connection.host}`);

    } catch (error) {
        //! Console log error to fix any issues
        console.log("Error connection to MongoDB: ", error.message);
        process.exit(1) // 1 is failure, 0 status code is success
    }
}