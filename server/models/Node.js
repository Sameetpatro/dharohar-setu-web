import mongoose from 'mongoose'

const nodeSchema = new mongoose.Schema({
  nodeId: {
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
  name: {
    type: String,
    required: true,
    trim: true,
  },
  sequenceOrder: {
    type: Number,
    default: 1,
  },
  nodeType: {
    type: String,
    enum: ['king', 'standard', 'poi', 'exit'],
    default: 'standard',
  },
  latitude: {
    type: Number,
  },
  longitude: {
    type: Number,
  },
  qrValue: {
    type: String,
    index: true,
  },
  description: {
    type: String,
    default: '',
  },
  prompt: {
    type: String,
    default: '',
  },
  amenities: {
    type: [String],
    default: [],
  },
  videoUrl: {
    type: String,
    default: '',
  },
  images: {
    type: [String],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

export const Node = mongoose.models.Node || mongoose.model('Node', nodeSchema)
export default Node
