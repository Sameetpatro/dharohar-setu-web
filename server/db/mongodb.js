import mongoose from 'mongoose'
import config from '../config.js'

let isConnected = false

export async function connectDB() {
  if (isConnected) {
    return mongoose.connection
  }

  try {
    const conn = await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 8000,
    })

    isConnected = true
    console.log('✔ Connected to MongoDB Atlas at cluster0.gjhehdj.mongodb.net')
    return conn
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message)
    throw err
  }
}

mongoose.connection.on('disconnected', () => {
  isConnected = false
  console.warn('MongoDB disconnected')
})

export default mongoose
