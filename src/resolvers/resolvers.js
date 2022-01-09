import User from "../models/user"
import Product from '../models/product'
import CartItem from "../models/cartItem"

import bcrypt from 'bcryptjs'
import { GraphQLDateTime } from 'graphql-iso-date'
import jwt from 'jsonwebtoken'

// # Need to be async, because it's promise.
const Query = {

  // todo: login
  login: async (parent, args, context, info) => {
    const { email, password } = args

    // find user in database
    const user = await User.findOne({ email })

    if (!user) throw new Error('Email not found, please sign up.')

    // check if password is correct
    const validPassword = await bcrypt.compare(password, user.password)

    if (!validPassword) throw new Error('Invalid email or password.')

    // create token
    const token = jwt.sign({ userId: user.id }, process.env.SECRET, { expiresIn: "7days" })

    return { userId: user.id, jwt: token }

  },

  // todo: user
  user: async (parent, args, { userId }, info) => {

    // check if user logged in
    if (!userId) throw new Error('Please log in.')

    // compare userId from token with userId from args
    if (userId !== args.id) throw new Error('Not authorized.')


    const oneUser = await User.findById(args.id)
      .populate({ path: 'products', populate: { path: 'user' } })
      .populate({ path: "carts", populate: { path: "product" } })
    return oneUser
  },

  // todo: users
  users: async (parent, args, context, info) => {
    const allUsers = await User.find({})
      .populate({ path: 'products', populate: { path: 'user' } })
      .populate({ path: "carts", populate: { path: "product" } })
    return allUsers
  },

  // todo: product
  product: async (parent, args, context, info) => {
    const oneProduct = await Product.findById(args.id)
      .populate({
        path: 'user',
        populate: { path: 'products' }
      })
    return oneProduct
  },

  // todo: products
  products: async (parent, args, context, info) => {
    const allProducts = await Product.find().populate({
      path: "user",
      populate: { path: "products" }
    })
    return allProducts
  }
}

const Mutation = {

  // todo: sign up
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

  // todo: create product
  createProduct: async (parent, args, { userId }, info) => {

    // check if user logged in
    if (!userId) throw new Error('Please log in.')

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

  // todo: update product
  updateProduct: async (parent, args, { userId }, info) => {
    const { id, desc, price, imageUrl } = args

    // check if user logged in
    if (!userId) throw new Error('Please log in.')

    // find product in datebase
    const product = await Product.findById(id)

    if (userId !== product.user.toString()) {
      throw new Error('You are not authorized.')
    }

    // new product info
    const updateInfo = {
      desc: !!desc ? desc : product.desc,
      price: !!price ? price : product.price,
      imageUrl: !!imageUrl ? imageUrl : product.imageUrl
    }

    // update product in database
    await Product.findByIdAndUpdate(id, updateInfo)

    // find the updated product and populate
    const updatedProduct = await Product.findById(id).populate({ path: "user" })

    return updatedProduct

  },

  // todo: add to cart
  addToCart: async (parent, args, { userId }, info) => {

    // get product id
    const { id } = args

    // check if user logged in
    if (!userId) throw new Error('Please log in.')

    try {

      // Find user by userId
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
  },

  // todo: delete cart
  deleteCart: async (parent, args, { userId }, info) => {

    // get cart id
    const { id } = args

    // check if user logged in
    if (!userId) throw new Error('Please log in.')

    // find cart by cart id
    const cart = await CartItem.findById(id)

    // find user by userId
    const user = await User.findById(userId)

    // check ownership of cart
    if (cart.user.toString() !== userId) {
      throw new Error('Not authorized.')
    }

    // delete cart
    const deletedCart = await CartItem.findOneAndRemove(id)

    // update user's carts
    const updatedUserCarts = user.carts.filter(cartId => cartId.toString() !== deletedCart.id.toString())

    // update user
    await User.findByIdAndUpdate(userId, {
      carts: updatedUserCarts
    })

    return deletedCart

  }
}

const resolvers = {
  Query,
  Mutation,
  Date: GraphQLDateTime
}

export default resolvers