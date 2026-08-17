import mongoose from 'mongoose'

const aiPromptSchema = new mongoose.Schema({
  promptId: {
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
  nodeId: {
    type: String,
  },
  nodeName: {
    type: String,
  },
  promptText: {
    type: String,
    required: true,
  },
  language: {
    type: String,
    default: 'en',
  },
  systemContext: {
    type: String,
    default: '',
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

export const AiPrompt = mongoose.models.AiPrompt || mongoose.model('AiPrompt', aiPromptSchema)
export default AiPrompt
