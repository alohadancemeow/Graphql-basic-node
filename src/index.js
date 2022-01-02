import express from 'express'
import server from './server'

const startServer = async () => {
    const app = express()
    const PORT = 5000

    await server.start()
    server.applyMiddleware({ app })


    app.listen({ port: PORT }, () => {
        console.log(`Server is running at http://localhost:${PORT}${server.graphqlPath}`)
    })
}

startServer()