const path = require('path')
const amqplib = require('amqplib')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

require('dotenv').config({ path: path.join(__dirname, '../.env') })

const AuthUser = require('./models/AuthUser')

mongoose
  .connect(process.env.MONGO_URI_AUTH, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('Connected to MongoDB Atlas - auth_db'))
  .catch((err) => {
    console.error('MongoDB Atlas connection error:', err.message)
    process.exit(1)
  })

async function connectRabbitMQ(retries = 5, delay = 3000) {
  const envUrl = (process.env.RABBITMQ_URL || '').trim()
  const urls = []

  if (envUrl) {
    const normalized = /^amqps?:\/\//i.test(envUrl) ? envUrl : `amqp://${envUrl}`
    urls.push(normalized)
  }

  if (!urls.includes('amqp://localhost')) {
    urls.push('amqp://localhost')
  }

  for (const url of urls) {
    for (let i = 0; i < retries; i += 1) {
      try {
        const conn = await amqplib.connect(url)
        console.log(`Connected to RabbitMQ (${url})`)
        return conn
      } catch (err) {
        console.log(
          `RabbitMQ not ready on ${url}, retrying in ${delay}ms... (${i + 1}/${retries})`
        )
        await new Promise((res) => setTimeout(res, delay))
      }
    }
  }

  throw new Error(
    `Could not connect to RabbitMQ after retries. Tried: ${urls.join(', ')}`
  )
}

async function start() {
  try {
    const connection = await connectRabbitMQ()
    const channel = await connection.createChannel()

    await channel.assertQueue('register', { durable: false })
    await channel.assertQueue('login', { durable: false })

    channel.consume('register', async (msg) => {
      if (!msg) return

      let response
      try {
        const payload = JSON.parse(msg.content.toString())
        const { email, password } = payload

        const existing = await AuthUser.findOne({ email })
        if (existing) {
          response = { success: false, message: 'Email already exists' }
        } else {
          const hashed = await bcrypt.hash(password, 10)
          const user = new AuthUser({ email, password: hashed })
          await user.save()
          response = { success: true, userId: user._id.toString() }
        }
      } catch (err) {
        response = { success: false, message: err.message }
      }

      channel.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify(response)), {
        correlationId: msg.properties.correlationId
      })
      channel.ack(msg)
    })

    channel.consume('login', async (msg) => {
      if (!msg) return

      let response
      try {
        const payload = JSON.parse(msg.content.toString())
        const { email, password } = payload

        const user = await AuthUser.findOne({ email })
        if (!user) {
          response = { success: false, message: 'Invalid credentials' }
        } else {
          const valid = await bcrypt.compare(password, user.password)
          if (!valid) {
            response = { success: false, message: 'Invalid credentials' }
          } else {
            const token = jwt.sign(
              { userId: user._id.toString(), email },
              process.env.JWT_SECRET,
              { expiresIn: '1h' }
            )
            user.token = token
            await user.save()
            response = { success: true, token }
          }
        }
      } catch (err) {
        response = { success: false, message: err.message }
      }

      channel.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify(response)), {
        correlationId: msg.properties.correlationId
      })
      channel.ack(msg)
    })

    console.log('auth-service waiting for register/login messages')
  } catch (err) {
    console.error('auth-service startup error:', err.message)
    process.exit(1)
  }
}

start()
