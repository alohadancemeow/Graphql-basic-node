import express from 'express'
import mongoose from 'mongoose'
import server from './server'

import { config } from 'dotenv'
config()

// From .env file
const { PORT, DB_USER, DB_PASSWORD, DB_ENDPOINT, DB_NAME } = process.env

const startServer = async () => {

    try {
        // connet to MongoDB
        await mongoose.connect(`mongodb+srv://${DB_USER}:${DB_PASSWORD}@${DB_ENDPOINT}/${DB_NAME}?retryWrites=true&w=majority`,
            {
                // useCreateIndex: true,
                // useNewUrlParser: true,
                useUnifiedTopology: true,
                // useFindAndModify: false
            },
            () => console.log('Conneted to mongodb')
        )

        const app = express()

        await server.start()
        server.applyMiddleware({ app })

        app.listen({ port: PORT }, () => {
            console.log(`Server is running at http://localhost:${PORT}${server.graphqlPath}`)
        })

    } catch (error) {
        throw error
    }
}

startServer()