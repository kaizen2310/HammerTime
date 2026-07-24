import mongoose from 'mongoose'

const bidSchema = new mongoose.Schema(
    {
        auctionId:{
            type :mongoose.Schema.Types.ObjectId,
            ref : 'Auction',
            required:true
        },
        bidderId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'User',
            required:true,
        },
        amount:{
            type:Number,required:true,min:0},
        },
        {timestamps:true}
)

export default mongoose.model('Bid',bidSchema)