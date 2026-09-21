import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
// import { prisma } from './utils/prisma.js';
import authRoutes from "./routes/auth.routes.js"
import jwksRoutes from "./routes/jwks.routes.js"
import cookieParser from 'cookie-parser';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));  
app.use(cookieParser());

app.get("/",(req, res)=>{
  res.status(200).json({
    message:"Task Pulse: Auth Service is live!"
  })
})
app.use("/api/auth", authRoutes)
app.use("/",jwksRoutes );

app.listen(PORT, () => {
  console.log(`Auth Service listening on http://localhost:${PORT}`);
});

export default app;