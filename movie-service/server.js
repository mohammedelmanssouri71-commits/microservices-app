const path = require('path')
const grpc = require('@grpc/grpc-js')
const protoLoader = require('@grpc/proto-loader')
const mongoose = require('mongoose')

require('dotenv').config({ path: path.join(__dirname, '../.env') })

const Movie = require('./models/Movie')

const packageDefinition = protoLoader.loadSync(path.join(__dirname, '../proto/movie.proto'))
const movieProto = grpc.loadPackageDefinition(packageDefinition).movie

mongoose
  .connect(process.env.MONGO_URI_MOVIES, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('Connected to MongoDB Atlas - movies_db'))
  .catch((err) => {
    console.error('MongoDB Atlas connection error:', err.message)
    process.exit(1)
  })

async function createMovie(call, callback) {
  try {
    const { title, userId } = call.request
    const movie = new Movie({ title, userId })
    await movie.save()

    callback(null, {
      id: movie._id.toString(),
      title: movie.title,
      userId: movie.userId
    })
  } catch (err) {
    callback({ code: grpc.status.INTERNAL, message: err.message })
  }
}

async function getMovie(call, callback) {
  try {
    const movie = await Movie.findById(call.request.id)
    if (!movie) {
      callback({ code: grpc.status.NOT_FOUND, message: 'Movie not found' })
      return
    }

    callback(null, {
      id: movie._id.toString(),
      title: movie.title,
      userId: movie.userId
    })
  } catch (err) {
    callback({ code: grpc.status.INTERNAL, message: err.message })
  }
}

const server = new grpc.Server()
server.addService(movieProto.MovieService.service, {
  CreateMovie: createMovie,
  GetMovie: getMovie
})

server.bindAsync('0.0.0.0:50052', grpc.ServerCredentials.createInsecure(), (err) => {
  if (err) {
    console.error('Failed to start movie-service:', err.message)
    process.exit(1)
  }
  console.log('movie-service gRPC listening on port 50052')
})
