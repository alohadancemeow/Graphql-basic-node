import User from "../models/user"
import Product from '../models/product'

import bcrypt from 'bcryptjs'
import { GraphQLDateTime } from 'graphql-iso-date'
import CartItem from "../models/cartItem"

// # Need to be async, because it's promise.
const Query = {
  // me: (parent, args, context, info) => me,
  user: async (parent, args, context, info) => {
    const oneUser = await User.findById(args.id)
      .populate({ path: 'products', populate: { path: 'user' } })
      .populate({ path: "carts", populate: { path: "product" } })
    // console.log(oneUser);
    return oneUser
  },
  users: async (parent, args, context, info) => {
    const allUsers = await User.find({})
      .populate({ path: 'products', populate: { path: 'user' } })
      .populate({ path: "carts", populate: { path: "product" } })
    // console.log(allUsers)
    return allUsers
  },
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
    const userId = '61d95f8ae225c67e0cc8ff6a'

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
  },

  // add to cart
  addToCart: async (parent, args, context, info) => {

    // id = productID
    const { id } = args

    try {

      // Find user who add to cart --> from loged in
      const userId = '61d95faafa3e25ed77d0ffce'
      const user = await User.findById(userId)
        .populate({
          path: "carts",
          populate: { path: "product" }
        })

      // Check if item is already added to cart ? index --> A : -1 --> B
      const findCartItemIndex = user.carts.findIndex(cartItem => cartItem.product.id === id)

      // A. already added.
      if (findCartItemIndex > -1) {

        // increase quantity in database
        user.carts[findCartItemIndex].quantity += 1

        // update to database
        await CartItem.findByIdAndUpdate(user.carts[findCartItemIndex].id, {
          quantity: user.carts[findCartItemIndex].quantity
        })

        // find updated item and populate
        const updatedcartItem = await CartItem.findById(user.carts[findCartItemIndex].id)
          .populate({ path: "product" })
          .populate({ path: "user" })

        return updatedcartItem
      }

      // B. not yet.
      else {

        // create new cart item
        const cartItem = await CartItem.create({
          product: id,
          quantity: 1,
          user: userId
        })

        // find new item and populate
        const newCartItem = await CartItem.findById(cartItem.id)
          .populate({ path: "product" })
          .populate({ path: "user" })

        // update user's carts
        await User.findByIdAndUpdate(userId, {
          carts: [...user.carts, newCartItem]
        })

        return newCartItem
      }

    } catch (error) {
      console.log(error);
    }
  }
}

const resolvers = {
  Query,
  Mutation,
  Date: GraphQLDateTime
}

export default resolvers