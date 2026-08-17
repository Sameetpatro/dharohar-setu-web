import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema({
  reviewId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  siteId: {
    type: String,
    required: true,
    index: true,
  },
  siteName: {
    type: String,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  userName: {
    type: String,
    default: 'Verified Tourist',
  },
  userEmail: {
    type: String,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    index: true,
  },
  q1Clarity: {
    type: Number,
    default: 5,
    min: 1,
    max: 5,
  },
  q2Accessibility: {
    type: Number,
    default: 5,
    min: 1,
    max: 5,
  },
  q3Overall: {
    type: Number,
    default: 5,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

export const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema)
export default Review
