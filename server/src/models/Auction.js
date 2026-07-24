import mongoose from 'mongoose'

const auctionSchema = new mongoose.Schema(
    {
        title :{ 
            type :String,
            required:true,
            trim :true
        },
        description :{
            type : String,
            required: true
        },
        startingPrice:{
            type : Number,
            required : true,
            min : 0
        },
        currentBid:{
            type: Number,
            default : null
        },
        currentWinnerId:{
            type : mongoose.Schema.Types.ObjectId,
            ref :'User',
            default: null,
        },
        sellerId :{
            type : mongoose.Schema.Types.ObjectId,
            ref:'User',
            required:true,
        },
        status:{
            type :String,
            enum : ['active','ended'],
            default : 'active'
        },
        endsAt:{
            type : Date , required : true
        },
    },
    { timestamps:true}
)

export default mongoose.model('Auction', auctionSchema)