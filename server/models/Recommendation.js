import mongoose from 'mongoose'

const recommendationSchema = new mongoose.Schema({
  recId: {
    type: String,
    required: true,
    unique: true,
  },
  siteId: {
    type: String,
    required: true,
    index: true,
  },
  category: {
    type: String,
    enum: ['hotel', 'restaurant', 'monument', 'craft', 'cafe', 'other'],
    default: 'restaurant',
  },
  name: {
    type: String,
    required: true,
  },
  latitude: {
    type: Number,
  },
  longitude: {
    type: Number,
  },
  distanceKm: {
    type: Number,
    default: 0.5,
  },
  rating: {
    type: Number,
    default: 4.5,
  },
  weightage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  isPromoted: {
    type: Boolean,
    default: false,
  },
  address: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

export const Recommendation = mongoose.models.Recommendation || mongoose.model('Recommendation', recommendationSchema)
export default Recommendation
