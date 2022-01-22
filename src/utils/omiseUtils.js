import OmiseFn from "omise";
import { config } from 'dotenv'
config()

const omise = OmiseFn({
    publicKey: process.env.OMISE_PUBLIC_KEY,
    secretKey: process.env.OMISE_SECRET_KEY
})

// retrieve customer
export const retrieveCustomer = (id) => {

    // check for customer id
    if (!id) return null

    return new Promise((resolve, reject) => {
        omise.customers.retrieve(id, (err, res) => {
            res ? resolve(res) : resolve(null)
        })
    })
}

// create customer
export const createCustomer = (email, description, card) => {
    return new Promise((resolve, reject) => {
        omise.customers.create({ email, description, card }, (err, res) => {
            res ? resolve(res) : resolve(null)
        })
    })
}

// create charge
export const createCharge = (amount, customer) => {

    console.log(amount, customer);

    return new Promise((resolve, reject) => {

        omise.charges.create({
            amount,
            currency: 'thb',
            customer
        }, (err, res) => {
            res ? resolve(res) : resolve(null)
        })
    })
}