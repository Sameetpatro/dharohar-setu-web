import mongoose from 'mongoose'

const tripSchema = new mongoose.Schema({
  tripId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  userName: {
    type: String,
    default: 'Visitor',
  },
  userEmail: {
    type: String,
  },
  siteId: {
    type: String,
    required: true,
    index: true,
  },
  siteName: {
    type: String,
  },
  siteLocation: {
    type: String,
  },
  startNodeId: {
    type: String,
  },
  startNodeName: {
    type: String,
  },
  startTime: {
    type: Date,
    default: Date.now,
    index: true,
  },
  endTime: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active',
    index: true,
  },
  durationMins: {
    type: Number,
  },
  notes: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

export const Trip = mongoose.models.Trip || mongoose.model('Trip', tripSchema)
export default Trip
