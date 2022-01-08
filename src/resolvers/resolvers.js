import User from "../models/user"
import Product from '../models/product'

import bcrypt from 'bcryptjs'

// # Need to be async, because it's promise.
const Query = {
  // me: (parent, args, context, info) => me,
  user: async (parent, args, context, info) => await User.findById(args.id),
  users: async (parent, args, context, info) => await User.find({}),
  product: async (parent, args, context, info) => {
    const oneProduct = await Product.findById(args.id)
      .populate({
        path: 'user',
        populate: { path: 'products' }
      })
    // console.log(oneProduct);
    return oneProduct
  },
  products: async (parent, args, context, info) => {
    const allProducts = await Product.find().populate({
      path: "user",
      populate: { path: "products" }
    })
    // console.log(allProducts);
    return allProducts
  }
}

const Mutation = {

  // sign up
  signup: async (parent, args, context, info) => {

    const email = args.email.trim().toLowerCase()
    const currentUsers = await User.find({})
    const isEmailExist = currentUsers.findIndex(user => user.email === email) > -1

    // check email
    if (isEmailExist) throw new Error('Email already exist.')

    // check password
    if (args.password.trim().length < 6) throw new Error('Password must be at least 6 charaters')

    // hash password
    const password = await bcrypt.hash(args.password, 10)

    // create user and return hashed password
    return User.create({ ...args, email, password })
  },

  // create product
  createProduct: async (parent, args, context, info) => {

    // get userID
    const userId = '61d3fa41269eecb1379b469e'

    if (!args.desc || !args.price || !args.imageUrl) {
      throw new Error('Please privide all required fields.')
    }

    const product = await Product.create({ ...args, user: userId })
    const user = await User.findById(userId)
    // console.log(user);

    // check if user has a product
    // "products" from database
    user.products
      ? user.products.push(product)
      : user.products = [product]

    // update user's info
    await user.save()

    return Product.findById(product.id).populate({
      path: "user",
      populate: { path: "products" }
    })
  }
}

const resolvers = {
  Query,
  Mutation
}

export default resolvers