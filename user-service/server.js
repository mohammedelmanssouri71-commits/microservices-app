const path = require('path')
const grpc = require('@grpc/grpc-js')
const protoLoader = require('@grpc/proto-loader')
const mongoose = require('mongoose')

require('dotenv').config({ path: path.join(__dirname, '../.env') })

const User = require('./models/User')

const packageDefinition = protoLoader.loadSync(path.join(__dirname, '../proto/user.proto'))
const userProto = grpc.loadPackageDefinition(packageDefinition).user

mongoose
  .connect(process.env.MONGO_URI_USERS, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('Connected to MongoDB Atlas - users_db'))
  .catch((err) => {
    console.error('MongoDB Atlas connection error:', err.message)
    process.exit(1)
  })

async function getUser(call, callback) {
  try {
    const user = await User.findById(call.request.id)
    if (!user) {
      callback({ code: grpc.status.NOT_FOUND, message: 'User not found' })
      return
    }

    callback(null, {
      id: user._id.toString(),
      name: user.name,
      email: user.email
    })
  } catch (err) {
    callback({ code: grpc.status.INTERNAL, message: err.message })
  }
}

const server = new grpc.Server()
server.addService(userProto.UserService.service, {
  GetUser: getUser
})

server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), (err) => {
  if (err) {
    console.error('Failed to start user-service:', err.message)
    process.exit(1)
  }
  console.log('user-service gRPC listening on port 50051')
})
