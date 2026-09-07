import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()
const app = express();
app.use(express.json())

const MONGO_URI = process.env.MONGO_URI as string;
const connectDB = async()=>{
   try {
     const connection = await mongoose.connect(MONGO_URI)
     console.log(`MongoDB Connected to ${connection.connection.host}`)
   } catch (error: any) {
    console.error(`Failed to connect MongoDB: ${error?.message || error}`)
   }
}
connectDB()

const PORT = process.env.PORT || 4002
app.use(cors())
app.get("/", (req, res)=>{
    res.status(200).json({
        message:"Task Service API!"
    })
})

app.listen(PORT, ()=>{
    console.log(`Task Service running om ${PORT}`);
})
