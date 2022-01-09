import jwt from 'jsonwebtoken'

const getUser = (token) => {
    if (!token) return null

    // split token
    const parsedToken = token.split(' ')[1]

    // decode token for get userId
    try {
        const decodedToken = jwt.verify(parsedToken, process.env.SECRET)
        return decodedToken.userId
    } catch (error) {
        return null
    }
}

export default getUser