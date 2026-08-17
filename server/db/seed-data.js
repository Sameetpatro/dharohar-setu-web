import bcrypt from 'bcryptjs'
import { connectDB } from './mongodb.js'
import User from '../models/User.js'
import Site from '../models/Site.js'
import Node from '../models/Node.js'
import Recommendation from '../models/Recommendation.js'
import Trip from '../models/Trip.js'
import Review from '../models/Review.js'
import AiPrompt from '../models/AiPrompt.js'

export async function seedInitialData() {
  await connectDB()

  const defaultPassword = process.env.INITIAL_ADMIN_PASSWORD || 'DharoharAdmin@2026'
  const passwordHash = await bcrypt.hash(defaultPassword, 10)

  // Ensure all initial admins exist and have role ADMIN with default password
  const initialAdmins = [
    { id: 'ADM-001', name: 'Chief Heritage Officer', email: 'admin@dharohar.app', role: 'ADMIN' },
    { id: 'ADM-002', name: 'Dr. Alok Verma (Curator)', email: 'heritage.curator@dharohar.app', role: 'ADMIN' },
    { id: 'ADM-003', name: 'Shivansh Khandelwal', email: 'superadmin@dharohar.app', role: 'ADMIN' },
    { id: 'ADM-004', name: 'Technical Admin', email: 'tech.lead@dharohar.app', role: 'ADMIN' },
    { id: 'ADM-005', name: 'Site Operations Lead', email: 'operations@dharohar.app', role: 'ADMIN' },
    { id: 'ADM-006', name: 'Archaeological Lead', email: 'archaeologist@dharohar.app', role: 'ADMIN' },
    { id: 'ADM-007', name: 'Alex Daye', email: 'alexdaye84_db_user@dharohar.app', role: 'ADMIN' },
    { id: 'ADM-008', name: 'Developer Admin', email: 'admin@localhost', role: 'ADMIN' },
  ]

  for (const adm of initialAdmins) {
    const existing = await User.findOne({ email: { $regex: new RegExp('^' + adm.email + '$', 'i') } })
    if (!existing) {
      await User.create({
        id: adm.id,
        name: adm.name,
        email: adm.email.toLowerCase(),
        passwordHash,
        role: 'ADMIN',
      })
    } else if (existing.role !== 'ADMIN') {
      existing.role = 'ADMIN'
      await existing.save()
    }
  }

  // Seed normal users
  const userCount = await User.countDocuments({ role: 'USER' })
  if (userCount === 0) {
    const userPassHash = await bcrypt.hash('TouristPass@2026', 10)
    const normalUsers = [
      { id: 'USR-101', name: 'Aarav Sharma', email: 'aarav.sharma@example.com' },
      { id: 'USR-102', name: 'Priya Patel', email: 'priya.patel@example.com' },
      { id: 'USR-103', name: 'Rohan Gupta', email: 'rohan.gupta@example.com' },
      { id: 'USR-104', name: 'Ananya Verma', email: 'ananya.verma@example.com' },
    ]

    for (const u of normalUsers) {
      await User.findOneAndUpdate(
        { email: u.email.toLowerCase() },
        { ...u, passwordHash: userPassHash, role: 'USER' },
        { upsert: true }
      )
    }
  }

  // Seed Baseline Sites
  const sitesCount = await Site.countDocuments()
  if (sitesCount === 0) {
    const sites = [
      {
        siteId: 'SITE-001',
        name: 'Qutub Minar Complex',
        location: 'Mehrauli, New Delhi',
        latitude: 28.5244,
        longitude: 77.1855,
        description: 'A 73-metre high tower of victory built in 1193 by Qutb-ud-din Aibak. Includes Quwwat-ul-Islam Mosque and the rust-resistant Iron Pillar.',
        summary: 'UNESCO World Heritage site centred around Delhis iconic minaret and ancient iron pillar.',
        imageUrl: '/assets/app-preview-7.jpg',
        coverImage: '/assets/app-preview-7.jpg',
        qrValue: 'QTB-0-KING',
        guideStatus: 'English & Hindi active',
        rating: 4.8,
        reviewsCount: 24,
      },
      {
        siteId: 'iiit-sonepat',
        name: 'IIIT Sonepat Campus Heritage Trail',
        location: 'Sonepat, Haryana',
        latitude: 28.989292,
        longitude: 77.151049,
        description: 'A mapped interactive campus experience that turns each architectural and cultural stop into a guided waypoint.',
        summary: 'Mapped campus experience with spatial discovery and audio check-ins.',
        imageUrl: '/assets/app-preview-8.jpg',
        coverImage: '/assets/app-preview-8.jpg',
        qrValue: 'iiit-main-entrance',
        guideStatus: 'English active',
        rating: 4.7,
        reviewsCount: 16,
      },
    ]

    for (const s of sites) {
      await Site.findOneAndUpdate({ siteId: s.siteId }, s, { upsert: true })
    }

    // Seed Nodes
    const nodes = [
      { nodeId: 'NODE-Q1', siteId: 'SITE-001', name: 'Main Entrance Gate', sequenceOrder: 1, nodeType: 'king', latitude: 28.5240, longitude: 77.1852, qrValue: 'QTB-0-KING', description: 'Primary checkpoint and King scanning node.' },
      { nodeId: 'NODE-Q2', siteId: 'SITE-001', name: 'Quwwat-ul-Islam Mosque', sequenceOrder: 2, nodeType: 'standard', latitude: 28.5245, longitude: 77.1856, qrValue: 'QTB-1-MOSQUE', description: 'One of the earliest mosques built in India with intricate carved pillars.' },
      { nodeId: 'NODE-Q3', siteId: 'SITE-001', name: 'Iron Pillar of Delhi', sequenceOrder: 3, nodeType: 'poi', latitude: 28.5246, longitude: 77.1857, qrValue: 'QTB-2-PILLAR', description: '1600-year-old rust-resistant metallurgical marvel from Gupta era.' },
    ]

    for (const n of nodes) {
      await Node.findOneAndUpdate({ nodeId: n.nodeId }, n, { upsert: true })
    }

    // Seed Prompts
    const prompts = [
      {
        promptId: 'PRM-001',
        siteId: 'SITE-001',
        siteName: 'Qutub Minar Complex',
        promptText: 'You are the expert Dharohar Heritage Companion for Qutub Minar Complex in Delhi. Answer visitor questions with deep historical accuracy and warmth.',
        language: 'en',
        systemContext: 'Qutub Minar Complex (UNESCO 1993). Built starting 1193 CE by Qutb-ud-din Aibak and Iltutmish.',
      },
    ]

    for (const p of prompts) {
      await AiPrompt.findOneAndUpdate({ promptId: p.promptId }, p, { upsert: true })
    }

    // Seed Trips
    const trips = [
      { tripId: 'TRIP-9001', userId: 'USR-101', userName: 'Aarav Sharma', siteId: 'SITE-001', siteName: 'Qutub Minar Complex', siteLocation: 'New Delhi', startNodeId: 'NODE-Q1', startNodeName: 'Main Entrance Gate', status: 'completed', durationMins: 65, notes: 'Completed full tour' },
      { tripId: 'TRIP-9002', userId: 'USR-102', userName: 'Priya Patel', siteId: 'SITE-001', siteName: 'Qutub Minar Complex', siteLocation: 'New Delhi', startNodeId: 'NODE-Q1', startNodeName: 'Main Entrance Gate', status: 'active', notes: 'Currently exploring' },
    ]

    for (const t of trips) {
      await Trip.findOneAndUpdate({ tripId: t.tripId }, t, { upsert: true })
    }

    // Seed Reviews
    const reviews = [
      { reviewId: 'REV-901', siteId: 'SITE-001', siteName: 'Qutub Minar Complex', userId: 'USR-101', userName: 'Aarav Sharma', rating: 5, q1Clarity: 5, q2Accessibility: 5, q3Overall: 5, comment: 'Outstanding wayfinding and storytelling.' },
    ]

    for (const r of reviews) {
      await Review.findOneAndUpdate({ reviewId: r.reviewId }, r, { upsert: true })
    }
  }

  console.log('✔ MongoDB baseline dataset ready.')
}

export default seedInitialData
