// fake database
const users = [
    {
        id: '1',
        name: '9A'
    },
    {
        id: '2',
        name: '9B'
    },
    {
        id: '3',
        name: '9C'
    }
]

const me = users[0]

// # Resolvers
export const resolvers = {
    Query: {
        me: (parent, args, context, info) => me,
        user: (parent, args, context, info) => {
            const id = args.id
            const user = users.find(user => user.id === id)

            return user
        },
        users: (parent, args, context, info) => users
    }
}

export default resolvers