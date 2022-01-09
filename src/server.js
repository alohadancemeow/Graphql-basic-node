import fs from "fs"
import path from "path"
import { ApolloServer } from "apollo-server-express"

// import typeDefs from "./schema/typeDefs"
import resolvers from "./resolvers/resolvers"
import getUser from './utils/getUser'

const typeDefs = fs
  .readFileSync(path.join(__dirname, "./schema", "schema.graphql"), "utf8")
  .toString()

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {

    // check token from headers
    const token = req.headers.authorization || ""

    // extract userId from token
    const userId = getUser(token)

    return { userId }
  }
})

export default server