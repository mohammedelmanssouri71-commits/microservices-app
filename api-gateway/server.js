const path = require('path')
const express = require('express')
const jwt = require('jsonwebtoken')
const amqplib = require('amqplib')
const { v4: uuidv4 } = require('uuid')
const grpc = require('@grpc/grpc-js')
const protoLoader = require('@grpc/proto-loader')

require('dotenv').config({ path: path.join(__dirname, '../.env') })

const app = express()
app.use(express.json())

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3001')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  next()
})
app.options('*', (req, res) => res.sendStatus(200))

const userPackage = protoLoader.loadSync(path.join(__dirname, '../proto/user.proto'))
const moviePackage = protoLoader.loadSync(path.join(__dirname, '../proto/movie.proto'))
const reviewPackage = protoLoader.loadSync(path.join(__dirname, '../proto/review.proto'))

const userProto = grpc.loadPackageDefinition(userPackage).user
const movieProto = grpc.loadPackageDefinition(moviePackage).movie
const reviewProto = grpc.loadPackageDefinition(reviewPackage).review

const userClient = new userProto.UserService('localhost:50051', grpc.credentials.createInsecure())
const movieClient = new movieProto.MovieService('localhost:50052', grpc.credentials.createInsecure())
const reviewClient = new reviewProto.ReviewService('localhost:50053', grpc.credentials.createInsecure())

let rabbitChannel

function getRabbitMQUrls() {
  const envUrl = (process.env.RABBITMQ_URL || '').trim()
  const urls = []

  if (envUrl) {
    const normalized = /^amqps?:\/\//i.test(envUrl) ? envUrl : `amqp://${envUrl}`
    urls.push(normalized)
  }

  if (!urls.includes('amqp://localhost')) {
    urls.push('amqp://localhost')
  }

  return urls
}

async function connectRabbitMQ(retries = 5, delay = 3000) {
  const urls = getRabbitMQUrls()

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

async function rpcCall(queue, payload) {
  const correlationId = uuidv4()
  const { queue: replyQueue } = await rabbitChannel.assertQueue('', { exclusive: true, autoDelete: true })

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('RabbitMQ timeout'))
    }, 5000)

    rabbitChannel.consume(
      replyQueue,
      (msg) => {
        if (!msg) return
        if (msg.properties.correlationId === correlationId) {
          clearTimeout(timeout)
          const content = JSON.parse(msg.content.toString())
          resolve(content)
        }
      },
      { noAck: true }
    )

    rabbitChannel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), {
      correlationId,
      replyTo: replyQueue
    })
  })
}

function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const [bearer, token] = header.split(' ')

    if (bearer !== 'Bearer' || !token) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' })
  }
}

function grpcToHttpError(err, res) {
  if (!err) return false

  if (err.code === grpc.status.NOT_FOUND) {
    res.status(404).json({ error: err.message })
    return true
  }
  if (err.code === grpc.status.INVALID_ARGUMENT) {
    res.status(400).json({ error: err.message })
    return true
  }

  res.status(500).json({ error: err.message || 'Internal server error' })
  return true
}

async function searchTmdbMovies(query) {
  const tmdbApiKey = (process.env.TMDB_API_KEY || '').trim()

  if (!tmdbApiKey) {
    throw new Error('TMDB_API_KEY is missing in environment')
  }

  const url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(
    query
  )}&include_adult=false&language=fr-FR&page=1`

  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${tmdbApiKey}`
    }
  })

  if (!response.ok) {
    throw new Error(`TMDB error (${response.status})`)
  }

  const data = await response.json()
  return (data.results || []).map((movie) => ({
    tmdbId: String(movie.id),
    title: movie.title,
    posterPath: movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : ''
  }))
}

app.post('/auth/register', async (req, res) => {
  try {
    const { fullName, email, password } = req.body
    const result = await rpcCall('register', { fullName, email, password })
    if (!result.success) {
      res.status(400).json({ error: result.message })
      return
    }
    res.status(201).json({ userId: result.userId })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const result = await rpcCall('login', { email, password })
    if (!result.success) {
      res.status(401).json({ error: result.message })
      return
    }
    res.status(200).json({ token: result.token, user: result.user })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/users/:id', authMiddleware, (req, res) => {
  userClient.GetUser({ id: req.params.id }, (err, response) => {
    if (grpcToHttpError(err, res)) return
    res.status(200).json(response)
  })
})

app.get('/movies/search', authMiddleware, async (req, res) => {
  const query = (req.query.q || '').toString().trim()

  if (!query) {
    res.status(400).json({ error: 'Query q is required' })
    return
  }

  try {
    const results = await searchTmdbMovies(query)
    res.status(200).json({ results })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/movies', authMiddleware, (req, res) => {
  const { title, tmdbId = '', posterPath = '' } = req.body
  const userId = req.user.userId
  movieClient.CreateMovie({ title, userId, tmdbId, posterPath }, (err, response) => {
    if (grpcToHttpError(err, res)) return
    res.status(201).json(response)
  })
})

app.get('/movies', authMiddleware, (req, res) => {
  movieClient.GetUserMovies({ userId: req.user.userId }, (err, response) => {
    if (grpcToHttpError(err, res)) return
    res.status(200).json(response)
  })
})

app.get('/movies/:id', authMiddleware, (req, res) => {
  movieClient.GetMovie({ id: req.params.id }, (err, response) => {
    if (grpcToHttpError(err, res)) return
    res.status(200).json(response)
  })
})

app.delete('/movies/:id', authMiddleware, (req, res) => {
  movieClient.DeleteMovie({ id: req.params.id }, (err, response) => {
    if (grpcToHttpError(err, res)) return
    res.status(200).json(response)
  })
})

app.post('/reviews', authMiddleware, (req, res) => {
  const { movieId, rating, comment } = req.body
  const userId = req.user.userId
  reviewClient.CreateReview(
    { movieId, userId, rating: Number(rating), comment },
    (err, response) => {
      if (grpcToHttpError(err, res)) return
      res.status(201).json(response)
    }
  )
})

app.get('/reviews', authMiddleware, (req, res) => {
  reviewClient.GetUserReviews({ userId: req.user.userId }, (err, response) => {
    if (grpcToHttpError(err, res)) return
    res.status(200).json(response)
  })
})

app.get('/reviews/:id', authMiddleware, (req, res) => {
  reviewClient.GetReview({ id: req.params.id }, (err, response) => {
    if (grpcToHttpError(err, res)) return
    res.status(200).json(response)
  })
})

app.put('/reviews/:id', authMiddleware, (req, res) => {
  const { rating, comment } = req.body
  reviewClient.UpdateReview(
    { id: req.params.id, rating: Number(rating), comment },
    (err, response) => {
      if (grpcToHttpError(err, res)) return
      res.status(200).json(response)
    }
  )
})

app.get('/movies/:id/reviews', authMiddleware, (req, res) => {
  reviewClient.GetMovieReviews({ movieId: req.params.id }, (err, response) => {
    if (grpcToHttpError(err, res)) return
    res.status(200).json(response)
  })
})

app.delete('/reviews/:id', authMiddleware, (req, res) => {
  reviewClient.DeleteReview({ id: req.params.id }, (err, response) => {
    if (grpcToHttpError(err, res)) return
    res.status(200).json(response)
  })
})

async function startGateway() {
  try {
    const connection = await connectRabbitMQ()
    rabbitChannel = await connection.createChannel()

    app.listen(process.env.PORT || 3000, () => {
      console.log(`api-gateway REST listening on port ${process.env.PORT || 3000}`)
    })
  } catch (err) {
    console.error('api-gateway startup error:', err.message)
    process.exit(1)
  }
}

startGateway()
