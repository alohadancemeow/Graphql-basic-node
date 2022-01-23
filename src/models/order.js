import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Types.ObjectId,
        ref: 'User'
    },
    items: [
        {
            type: mongoose.Types.ObjectId,
            ref: 'OrderItem'
        }
    ],
    authorize_uri: {
        type: String
    },
    createdAt: {
        type: Date,
        required: true,
        default: () => Date.now()
    },

})

const Order = mongoose.model('Order', orderSchema)
export default Order;
