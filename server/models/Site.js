import mongoose from 'mongoose'

const siteSchema = new mongoose.Schema({
  siteId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    type: String,
    required: true,
  },
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  summary: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  history: {
    type: String,
    default: '',
  },
  funFacts: {
    type: String,
    default: '',
  },
  helplineNumber: {
    type: String,
    default: '+91-11-23365333',
  },
  videoUrl: {
    type: String,
    default: '',
  },
  images: {
    type: [String],
    default: ['/assets/app-preview-7.jpg'],
  },
  imageUrl: {
    type: String,
    default: '/assets/app-preview-7.jpg',
  },
  coverImage: {
    type: String,
    default: '/assets/app-preview-7.jpg',
  },
  qrValue: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  guideStatus: {
    type: String,
    default: 'English & Hindi active',
  },
  rating: {
    type: Number,
    default: 4.8,
  },
  reviewsCount: {
    type: Number,
    default: 0,
  },
  isCustom: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

export const Site = mongoose.models.Site || mongoose.model('Site', siteSchema)
export default Site
