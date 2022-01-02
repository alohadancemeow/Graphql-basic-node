import { gql } from 'apollo-server-express'

// # Create Schema
const typeDefs = gql`

   type Query {
       me: User!
       user(id: ID!) : User
       users: [User]!
   }
 
   # A user has id, name
   type User {
        id: ID!
        name: String!
    }
`
export default typeDefs