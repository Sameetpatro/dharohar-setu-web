#!/usr/bin/env node

import readline from 'readline'
import bcrypt from 'bcryptjs'
import prisma from '../db/prisma.js'
import config from '../config.js'

const args = process.argv.slice(2)
const parsedArgs = {}
args.forEach((arg) => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=')
    parsedArgs[key] = value !== undefined ? value : true
  }
})

async function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

async function upsertAdmin({ name, username, email, password, role = 'ADMIN', mustChangePassword = false, createdBy = 'SYSTEM_SEED' }) {
  if (!email || !password) {
    throw new Error('Both email and password are required.')
  }

  const cleanEmail = email.toLowerCase().trim()
  const cleanUsername = username ? username.toLowerCase().trim() : cleanEmail.split('@')[0]
  const passwordHash = await bcrypt.hash(password, config.bcryptSaltRounds)

  const updated = await prisma.user.upsert({
    where: { email: cleanEmail },
    create: {
      email: cleanEmail,
      username: cleanUsername,
      name: name || 'Dharohar Administrator',
      passwordHash,
      role,
      mustChangePassword,
      createdBy,
      isActive: true,
    },
    update: {
      username: cleanUsername,
      name: name || 'Dharohar Administrator',
      passwordHash,
      role,
      mustChangePassword,
      isActive: true,
    },
  })

  console.log(`✔ ${role} provisioned in PostgreSQL: '${cleanEmail}' [ID: ${updated.id}]`)
  return updated
}

async function seedBaselineMonuments() {
  console.log('\nSeeding baseline monuments and nodes into PostgreSQL...')

  // 1. Qutub Minar (SITE-001)
  await prisma.site.upsert({
    where: { siteId: 'SITE-001' },
    create: {
      siteId: 'SITE-001',
      name: 'Qutub Minar Complex',
      location: 'Mehrauli, New Delhi',
      latitude: 28.5245,
      longitude: 77.1855,
      summary: 'UNESCO World Heritage Site featuring a 72.5-meter red sandstone victory minaret and ancient metallurgical wonders.',
      description: 'The Qutub Minar Complex represents the synthesis of Persian, Arabic, and Indian architectural traditions constructed across multiple sultanates.',
      history: 'Founded in 1192 CE by Qutb-ud-din Aibak and expanded by Iltutmish and Alauddin Khalji.',
      funFacts: 'The 1600-year-old Iron Pillar of Chandragupta II has zero rust due to a high phosphorus composition forming a misawite protective layer.',
      helplineNumber: '+91-11-23365333',
      videoUrl: 'https://www.youtube.com/watch?v=sample-qutub',
      imageUrl: '/assets/app-preview-7.jpg',
      coverImage: '/assets/app-preview-7.jpg',
      images: ['/assets/app-preview-7.jpg', '/assets/app-preview-1.jpg'],
      qrValue: 'QMC-0',
      guideStatus: 'English & Hindi active',
      rating: 4.9,
      reviewsCount: 28,
      isCustom: false,
    },
    update: {
      name: 'Qutub Minar Complex',
      location: 'Mehrauli, New Delhi',
      qrValue: 'QMC-0',
    },
  })

  // Nodes for Qutub Minar
  const qutubNodes = [
    { nodeId: 'NODE-001-1', name: 'Main Entrance & Ticket Arcade', seq: 1, type: 'king', qr: 'QMC-0', desc: 'Main King entry checkpoint where tourists scan to begin guided immersion.', prompt: 'Welcome tourists warmly and introduce the Indo-Islamic stone archways.' },
    { nodeId: 'NODE-001-2', name: 'The Victory Minaret', seq: 2, type: 'standard', qr: 'QMC-1', desc: '72.5m soaring tower with 379 spiral steps and intricate calligraphic bands.', prompt: 'Explain the five distinct storeys and the balcony cantilever brackets.' },
    { nodeId: 'NODE-001-3', name: 'The Rustless Iron Pillar', seq: 3, type: 'poi', qr: 'QMC-2', desc: 'Gupta-era 6-ton metallurgical wonder that has withstood corrosion for 1,600 years.', prompt: 'Focus on 4th-century metallurgical mastery and the high phosphorus shielding layer.' },
    { nodeId: 'NODE-001-4', name: 'Alai Minar & Quwwat-ul-Islam', seq: 4, type: 'exit', qr: 'QMC-3', desc: 'Massive unfinished base planned by Alauddin Khalji to double Qutub Minar height.', prompt: 'Discuss Sultan Alauddin Khaljis ambitious architectural vision.' },
  ]

  for (const n of qutubNodes) {
    await prisma.node.upsert({
      where: { nodeId: n.nodeId },
      create: {
        nodeId: n.nodeId,
        siteId: 'SITE-001',
        name: n.name,
        sequenceOrder: n.seq,
        nodeType: n.type,
        qrValue: n.qr,
        description: n.desc,
        prompt: n.prompt,
        latitude: 28.5245 + (n.seq * 0.0002),
        longitude: 77.1855 + (n.seq * 0.0002),
        amenities: ['Drinking Water', 'Restrooms', 'Wheelchair Ramp', 'Audio Guide Desk'],
      },
      update: {
        name: n.name,
        nodeType: n.type,
        qrValue: n.qr,
        description: n.desc,
        prompt: n.prompt,
      },
    })
  }

  // Recommendations for Qutub Minar
  const qutubRecs = [
    { recId: 'REC-001-1', name: 'Olive Bar & Kitchen (Partner)', cat: 'restaurant', lat: 28.5255, lng: 77.1865, dist: 0.4, rating: 4.8, weight: 85, address: 'One Style Mile, Mehrauli' },
    { recId: 'REC-001-2', name: 'Mehrauli Archaeological Park Cafe', cat: 'cafe', lat: 28.5230, lng: 77.1840, dist: 0.6, rating: 4.6, weight: 60, address: 'Opposite Qutub Minar Metro Gate 2' },
  ]

  for (const r of qutubRecs) {
    await prisma.recommendation.upsert({
      where: { recId: r.recId },
      create: {
        recId: r.recId,
        siteId: 'SITE-001',
        name: r.name,
        category: r.cat,
        latitude: r.lat,
        longitude: r.lng,
        distanceKm: r.dist,
        rating: r.rating,
        weightage: r.weight,
        isPromoted: r.weight > 0,
        address: r.address,
      },
      update: {
        name: r.name,
        weightage: r.weight,
        isPromoted: r.weight > 0,
      },
    })
  }

  console.log('✔ Baseline monuments, nodes, and partner recommendations seeded in PostgreSQL.')
}

async function run() {
  console.log('========================================================')
  console.log('  DHAROHAR ADMIN & DATABASE SEEDING UTILITY (POSTGRESQL)')
  console.log('========================================================\n')

  await prisma.$connect()

  const defaultPassword = process.env.SUPER_ADMIN_PASSWORD || process.env.INITIAL_ADMIN_PASSWORD || 'DharoharAdmin@2026'

  // 1. Reset all admin accounts and configure sole SUPER_ADMIN (dharoharsetu@gmail.com)
  if (parsedArgs['sole-super-admin'] || parsedArgs['reset-admins'] || parsedArgs['clean-super-admin']) {
    console.log('🧹 Purging all existing administrator accounts from PostgreSQL database...')
    await prisma.adminInvite.deleteMany({})
    await prisma.passwordReset.deleteMany({})
    await prisma.user.deleteMany({})
    console.log('✔ All existing administrator records purged.')

    const superAdminEmail = (parsedArgs.email || process.env.SUPER_ADMIN_EMAIL || 'dharoharsetu@gmail.com').toLowerCase().trim()
    const superAdminName = parsedArgs.name || process.env.SUPER_ADMIN_NAME || 'Dharohar Super Admin'
    const superAdminUsername = (parsedArgs.username || process.env.SUPER_ADMIN_USERNAME || 'dharoharsetu').toLowerCase().trim()

    await upsertAdmin({
      name: superAdminName,
      username: superAdminUsername,
      email: superAdminEmail,
      password: defaultPassword,
      role: 'SUPER_ADMIN',
      mustChangePassword: false,
      createdBy: 'SYSTEM_SEED',
    })

    await seedBaselineMonuments()

    console.log(`\n=======================================================`)
    console.log(`🎉 Sole SUPER_ADMIN established: '${superAdminEmail}'`)
    console.log(`ℹ Role: SUPER_ADMIN (Full Administrative Control)`)
    console.log(`ℹ Password: ${defaultPassword}`)
    console.log(`ℹ Sign In URL: /admin-login`)
    console.log(`=======================================================\n`)
    process.exit(0)
  }

  // 2. Check for explicit --super-admin flag
  if (parsedArgs['super-admin'] || parsedArgs.superAdmin) {
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || defaultPassword

    const superAdminEmail = (parsedArgs.email || process.env.SUPER_ADMIN_EMAIL || 'dharoharsetu@gmail.com').toLowerCase().trim()
    const superAdminName = parsedArgs.name || process.env.SUPER_ADMIN_NAME || 'Dharohar Super Admin'
    const superAdminUsername = (parsedArgs.username || process.env.SUPER_ADMIN_USERNAME || 'dharoharsetu').toLowerCase().trim()

    await upsertAdmin({
      name: superAdminName,
      username: superAdminUsername,
      email: superAdminEmail,
      password: superAdminPassword.trim(),
      role: 'SUPER_ADMIN',
      mustChangePassword: false,
      createdBy: 'SYSTEM_SEED',
    })

    console.log(`\n✔ SUPER_ADMIN account seeded: '${superAdminEmail}' [Role: SUPER_ADMIN]`)
    console.log('ℹ You can log in at /admin-login\n')
    process.exit(0)
  }

  // 3. Batch seed option
  const initialAdmins = [
    { name: 'Dharohar Super Admin', email: 'dharoharsetu@gmail.com', username: 'dharoharsetu' },
  ]

  if (parsedArgs['initial-six'] || parsedArgs.batch || !process.stdin.isTTY) {
    console.log('Seeding baseline SUPER_ADMIN into PostgreSQL...')
    for (const a of initialAdmins) {
      await upsertAdmin({
        name: a.name,
        username: a.username,
        email: a.email,
        password: defaultPassword,
        role: 'SUPER_ADMIN',
        mustChangePassword: false,
        createdBy: 'SYSTEM_SEED',
      })
    }

    await seedBaselineMonuments()

    console.log('\n✔ Sole Super Admin account provisioned in PostgreSQL.')
    console.log(`ℹ Master password set to: ${defaultPassword}`)
    console.log('ℹ You can log in at /admin-login\n')
    process.exit(0)
  }

  // 4. Interactive prompt
  console.log('Select an option:')
  console.log('1. Set dharoharsetu@gmail.com as the SOLE Super Admin (clears all other accounts)')
  console.log('2. Provision / update a custom administrator account interactively')
  console.log('3. Exit\n')

  const choice = await promptUser('Enter choice (1/2/3) [Default 1]: ')

  if (choice === '2') {
    const email = await promptUser('Admin Email: ')
    if (!email) {
      console.error('❌ Email cannot be empty.')
      process.exit(1)
    }

    const username = await promptUser('Admin Username: ')
    const name = await promptUser('Admin Full Name: ')
    const password = await promptUser('Admin Password (min 8 chars): ')

    if (!password || password.length < 8) {
      console.error('❌ Password must be at least 8 characters long.')
      process.exit(1)
    }

    await upsertAdmin({ name, username, email, password, role: 'ADMIN', mustChangePassword: false })
    console.log('\n✔ Interactive admin account setup complete in PostgreSQL!')
    process.exit(0)
  } else if (choice === '3') {
    console.log('Exiting.')
    process.exit(0)
  } else {
    console.log('🧹 Purging old admins and establishing dharoharsetu@gmail.com...')
    await prisma.adminInvite.deleteMany({})
    await prisma.passwordReset.deleteMany({})
    await prisma.user.deleteMany({})
    await upsertAdmin({
      name: 'Dharohar Super Admin',
      username: 'dharoharsetu',
      email: 'dharoharsetu@gmail.com',
      password: defaultPassword,
      role: 'SUPER_ADMIN',
      mustChangePassword: false,
      createdBy: 'SYSTEM_SEED',
    })
    await seedBaselineMonuments()
    console.log('\n✔ Sole Super Admin (dharoharsetu@gmail.com) provisioned in PostgreSQL.')
    process.exit(0)
  }
}

run().catch((err) => {
  console.error('❌ Error seeding accounts in PostgreSQL:', err)
  process.exit(1)
})