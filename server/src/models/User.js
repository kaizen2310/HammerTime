import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
    {
        username:{
            type :String,
            required :true,
            unique:true,
            trim: true,
            minlength :3,
        },
        email : {
            type:String,
            required :true,
            unique:true,
            lowercase:true,
            trim:true,
        },
        passwordHash :{
            type:String,
            required:true,
        }
    },
    {TimeStamps :true}
)

userSchema.pre('save' , async function () {
    if(!this.isModified('passwordHash')) return 
    this.passwordHash = await bcrypt.hash(this.passwordHash,12)    
})

userSchema.methods.comparePassword = async function (candidate) {
    return bcrypt.compare(candidate,this.passwordHash)   
}

export default mongoose.model('User',userSchema)