const path = require('path')
const grpc = require('@grpc/grpc-js')
const protoLoader = require('@grpc/proto-loader')
const mongoose = require('mongoose')

require('dotenv').config({ path: path.join(__dirname, '../.env') })

const Review = require('./models/Review')

const packageDefinition = protoLoader.loadSync(path.join(__dirname, '../proto/review.proto'))
const reviewProto = grpc.loadPackageDefinition(packageDefinition).review

mongoose
  .connect(process.env.MONGO_URI_REVIEWS, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('Connected to MongoDB Atlas - reviews_db'))
  .catch((err) => {
    console.error('MongoDB Atlas connection error:', err.message)
    process.exit(1)
  })

function mapReview(review) {
  return {
    id: review._id.toString(),
    movieId: review.movieId,
    userId: review.userId,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString()
  }
}

async function createReview(call, callback) {
  try {
    const { movieId, userId, rating, comment } = call.request

    if (rating < 1 || rating > 5) {
      callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'Rating must be between 1 and 5'
      })
      return
    }

    const review = new Review({ movieId, userId, rating, comment })
    await review.save()
    callback(null, mapReview(review))
  } catch (err) {
    callback({ code: grpc.status.INTERNAL, message: err.message })
  }
}

async function getReview(call, callback) {
  try {
    const review = await Review.findById(call.request.id)
    if (!review) {
      callback({ code: grpc.status.NOT_FOUND, message: 'Review not found' })
      return
    }

    callback(null, mapReview(review))
  } catch (err) {
    callback({ code: grpc.status.INTERNAL, message: err.message })
  }
}

async function getMovieReviews(call, callback) {
  try {
    const reviews = await Review.find({ movieId: call.request.movieId })
    callback(null, { reviews: reviews.map(mapReview) })
  } catch (err) {
    callback({ code: grpc.status.INTERNAL, message: err.message })
  }
}

async function deleteReview(call, callback) {
  try {
    const deleted = await Review.findByIdAndDelete(call.request.id)
    if (!deleted) {
      callback({ code: grpc.status.NOT_FOUND, message: 'Review not found' })
      return
    }

    callback(null, { success: true, message: 'Review deleted' })
  } catch (err) {
    callback({ code: grpc.status.INTERNAL, message: err.message })
  }
}

const server = new grpc.Server()
server.addService(reviewProto.ReviewService.service, {
  CreateReview: createReview,
  GetReview: getReview,
  GetMovieReviews: getMovieReviews,
  DeleteReview: deleteReview
})

server.bindAsync('0.0.0.0:50053', grpc.ServerCredentials.createInsecure(), (err) => {
  if (err) {
    console.error('Failed to start review-service:', err.message)
    process.exit(1)
  }
  console.log('review-service gRPC listening on port 50053')
})
