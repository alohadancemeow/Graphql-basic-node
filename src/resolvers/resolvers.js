import User from "../models/user"
import bcrypt from 'bcryptjs'

const Query = {
  // me: (parent, args, context, info) => me,
  user: async (parent, args, context, info) => await User.findById(args.id),
  users: async (parent, args, context, info) => await User.find({})
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
  }
}

const resolvers = {
  Query,
  Mutation
}

export default resolvers