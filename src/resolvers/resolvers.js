import User from "../models/user"
import Product from '../models/product'
import CartItem from "../models/cartItem"
import OrderItem from '../models/orderItem'
import Order from '../models/order'

import bcrypt from 'bcryptjs'
import { GraphQLDateTime } from 'graphql-iso-date'
import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'

// note: verify email before use this.
import sgMail from '@sendgrid/mail'

// omise utils
import { retrieveCustomer, createCustomer, createCharge, createChargeInternetBanking } from '../utils/omiseUtils'

// # Need to be async, because it's promise.
const Query = {

  // todo: user
  user: async (parent, args, { userId }, info) => {

    // check if user logged in
    if (!userId) throw new Error('Please log in.')

    const oneUser = await User.findById(userId)
      .populate({ path: 'products', options: { sort: { createdAt: 'desc' } }, populate: { path: 'user' } })
      .populate({ path: "carts", populate: { path: "product" } })
      .populate({
        path: 'orders',
        options: { sort: { createdAt: 'desc' } },
        populate: { path: 'items', populate: { path: 'product' } }
      })
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
    }).sort({ createdAt: 'desc' })
    return allProducts
  }
}

const Mutation = {

  // todo: sign up
  signup: async (parent, args, context, info) => {

    // check if args are empty
    if (!args.name || !args.email || !args.password) {
      throw new Error('Please privide all required fields.')
    }

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

  // todo: login
  login: async (parent, args, context, info) => {
    const { email, password } = args

    // find user in database and poppulate products, carts
    const user = await User.findOne({ email })
      .populate({ path: 'products', populate: { path: 'user' } })
      .populate({ path: "carts", populate: { path: "product" } })
      .populate({
        path: 'orders',
        options: { sort: { createdAt: 'desc' } },
        populate: { path: 'items', populate: { path: 'product' } }
      })

    if (!user) throw new Error('Email not found, please sign up.')

    // check if password is correct
    const validPassword = await bcrypt.compare(password, user.password)

    if (!validPassword) throw new Error('Invalid email or password.')

    // create token
    const token = jwt.sign({ userId: user.id }, process.env.SECRET, { expiresIn: "7days" })

    return { user, jwt: token }

  },

  // todo: request to reset password
  requestResetPassword: async (parent, { email }, context, info) => {

    // check if args are empty
    if (!email) {
      throw new Error('Please privide all required fields.')
    }

    // find user in database by email
    const user = await User.findOne({ email })

    // if not found
    if (!user) throw new Error('Email not found, please sign up instead.')

    // create a resetPasswordToken and resetTokenExpiry
    const resetPasswordToken = randomBytes(32).toString('hex')
    const resetTokenExpiry = Date.now() + 30 * 60 * 1000

    // update user (add reset token, reset expiry)
    await User.findByIdAndUpdate(user.id, {
      resetPasswordToken,
      resetTokenExpiry
    })

    // send link for set password to user email
    sgMail.setApiKey(process.env.SEND_EMAIL_API_KEY)
    const message = {
      from: 'rabbit.bot@outlook.com',
      to: user.email,
      subject: 'Reset password link',
      html: `
        <div> 
          <p>Please click the link below to proceed reset password.</p> \n\n
          <a href="http://localhost:3000/signin/resetpassword?resetToken=${resetPasswordToken}" target='blank' style={{color: 'blue'}}>Click to reset your password</a>
        </div>
      `
    }
    sgMail.send(message)
      .then(() => {
        console.log('Message sent')
      }).catch((error) => {
        console.log(error.response.body)
      })

    // return message to frontend
    return { message: 'Please check your email to proceed reset password.' }
  },

  // todo: reset password
  resetPassword: async (parent, { password, token }, context, info) => {

    // find user in database by reset token
    const user = await User.findOne({ resetPasswordToken: token })

    // if not found
    if (!user) throw new Error('Invalid token, cannot reset password.')

    // check if token is expired
    const isTokenExpired = user.resetTokenExpiry < Date.now()
    if (isTokenExpired) throw new Error('Token is expired, cannot reset password.')

    // validate and hash password
    if (password.trim().length < 6) throw new Error('Password must be at least 6 charaters.')
    const hashedPassword = await bcrypt.hash(password, 10)

    // update user in database, 
    // save new hashed password,
    // and delete reset token, token expiry.
    await User.findByIdAndUpdate(user.id, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetTokenExpiry: null
    })

    return { message: 'You have successfully reset your password, please sign in.' }
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
    const deletedCart = await CartItem.findByIdAndRemove(id)

    // update user's carts
    const updatedUserCarts = user.carts.filter(cartId => cartId.toString() !== deletedCart.id.toString())

    // update user
    await User.findByIdAndUpdate(userId, {
      carts: updatedUserCarts
    })

    return deletedCart

  },

  // todo: create order
  createOrder: async (parent, { amount, cardId, token, return_uri }, { userId }, info) => {

    // check if user logged in
    if (!userId) throw new Error('Please log in.')

    // Query user from database
    const user = await User.findById(userId)
      .populate({
        path: 'carts',
        populate: { path: 'product' }
      })
    // console.log(user);

    // create charge with omise
    // retrieve customer
    let customer

    // todo: # Credit Card
    // check for cardId, if user use existing card
    if (amount && cardId && !token && !return_uri) {
      const cust = await retrieveCustomer(cardId)
      if (!cust) throw new Error('Cannot process payment.')
      customer = cust
    }

    // create new customer, if no customer or user use a new card
    if (amount && token && !cardId && !return_uri) {
      const newCustomer = await createCustomer(user.email, user.name, token)
      if (!newCustomer) throw new Error('Cannot process payment.')
      customer = newCustomer
      console.log('newCustomer', newCustomer);

      // update user'cards field
      const {
        id,
        expiration_month,
        expiration_year,
        brand,
        last_digits
      } = newCustomer.cards.data[0]

      const newCard = {
        id: newCustomer.id,
        cardInfo: {
          id,
          expiration_month,
          expiration_year,
          brand,
          last_digits
        }
      }

      // update user's cards
      await User.findByIdAndUpdate(userId, {
        cards: [newCard, ...user.cards]
      })
    }

    // create charge
    let charge

    if (token && return_uri) {
      // Internet Backing
      charge = await createChargeInternetBanking(amount, token, return_uri)

    } else {
      // Credit card
      charge = await createCharge(amount, customer.id)
    }

    // console.log('charge', charge);
    if (!charge) throw new Error('Something went wrong with payment, please try again.')

    // convert CartItem to OrderItem
    const convertCartToOrder = async () => {
      return Promise.all(
        user.carts.map(cart => OrderItem.create({
          product: cart.product,
          quantity: cart.quantity,
          user: cart.user
        }))
      )
    }

    // get order item array after converted
    const orderItems = await convertCartToOrder()

    // creaet order
    const order = await Order.create({
      user: userId,
      items: orderItems.map(orderItem => orderItem.id),
      authorize_uri: charge.authorize_uri
    })

    // delete CartItem from carts
    const deleteCartItem = async () => {
      return Promise.all(
        user.carts.map(cart => CartItem.findByIdAndRemove(cart.id))
      )
    }

    await deleteCartItem()

    // update user info
    await User.findByIdAndUpdate(userId, {
      carts: [],
      orders: !user.orders
        ? [order.id]
        : [...user.orders, order.id]
    })

    // return Order and populate user, items
    return Order.findById(order.id)
      .populate({ path: 'user' })
      .populate({ path: 'items', populate: { path: 'product' } })

  }
}

const resolvers = {
  Query,
  Mutation,
  Date: GraphQLDateTime
}

export default resolvers