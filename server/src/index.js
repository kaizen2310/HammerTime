import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import'./models/User.js'
import'./models/Auction.js'
console.log('Registered models:', mongoose.modelNames()) // ✅ add this
import authRoutes from './routes/auth.js'
import auctionRoutes from './routes/auctions.js'
dotenv.config()

console.log('JWT_SECRET loaded:', !!process.env.JWT_SECRET)

const app = express()

app.use (cors({
    origin : process.env.CLIENT_URL,
    credentials:true
}))
app.use(express.json())


app.use('/api/auth' ,authRoutes)
app.use('/api/auctions',auctionRoutes)


app.get('/health' , (req,res) => res.json({status : 'ok'}))

mongoose.connect(process.env.MONGODB_URI).then(() =>{
    console.log('MongoDb connected')
    app.listen(process.env.PORT || 5000, () => {
            console.log(`server running on port ${process.env.PORT || 5000}`)
    })
})
.catch((err) => {
    console.error('MongoDB connection failed' , err.message)
    process.exit(1)
})   

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err)
})