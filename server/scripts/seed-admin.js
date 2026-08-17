#!/usr/bin/env node

import readline from 'readline'
import bcrypt from 'bcryptjs'
import { connectDB } from '../db/mongodb.js'
import User from '../models/User.js'
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

async function upsertAdmin({ id, name, email, password }) {
  if (!email || !password) {
    throw new Error('Both email and password are required.')
  }

  const cleanEmail = email.toLowerCase().trim()
  const passwordHash = await bcrypt.hash(password, config.bcryptSaltRounds)
  const adminId = id || 'ADM-' + Date.now().toString().slice(-4)

  const updated = await User.findOneAndUpdate(
    { email: cleanEmail },
    {
      id: adminId,
      name: name || 'Dharohar Administrator',
      email: cleanEmail,
      passwordHash,
      role: 'ADMIN',
      updatedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  console.log(`✔ Admin provisioned in MongoDB: '${cleanEmail}' [ID: ${updated.id}]`)
  return updated
}

async function run() {
  console.log('=====================================================')
  console.log('    DHAROHAR ADMIN ACCOUNT SEEDING UTILITY (MONGODB) ')
  console.log('=====================================================\n')

  await connectDB()

  // 1. Check CLI flags or environment variables
  const cliEmail = parsedArgs.email || process.env.ADMIN_EMAIL
  const cliPassword = parsedArgs.password || process.env.ADMIN_PASSWORD
  const cliName = parsedArgs.name || process.env.ADMIN_NAME

  if (cliEmail && cliPassword) {
    console.log(`Processing admin credentials from CLI/Environment...`)
    await upsertAdmin({
      name: cliName || 'System Admin',
      email: cliEmail,
      password: cliPassword,
    })
    console.log('\n✔ Admin seeding completed successfully in MongoDB.')
    process.exit(0)
  }

  // 2. Batch initial 6 administrators
  const defaultPassword = process.env.INITIAL_ADMIN_PASSWORD || 'DharoharAdmin@2026'
  const initialAdmins = [
    { id: 'ADM-001', name: 'Chief Heritage Officer', email: 'admin@dharohar.app' },
    { id: 'ADM-002', name: 'Dr. Alok Verma (Curator)', email: 'heritage.curator@dharohar.app' },
    { id: 'ADM-003', name: 'Shivansh Khandelwal', email: 'superadmin@dharohar.app' },
    { id: 'ADM-004', name: 'Technical Admin', email: 'tech.lead@dharohar.app' },
    { id: 'ADM-005', name: 'Site Operations Lead', email: 'operations@dharohar.app' },
    { id: 'ADM-006', name: 'Archaeological Lead', email: 'archaeologist@dharohar.app' },
  ]

  if (parsedArgs['initial-six'] || parsedArgs.batch || !process.stdin.isTTY) {
    console.log('Seeding baseline batch of 6 Initial Administrators into MongoDB...')
    for (const a of initialAdmins) {
      await upsertAdmin({
        id: a.id,
        name: a.name,
        email: a.email,
        password: defaultPassword,
      })
    }

    console.log('\n✔ All 6 initial admin accounts provisioned idempotently in MongoDB.')
    console.log(`ℹ Master password set to: ${defaultPassword}`)
    console.log('ℹ You can log in at /admin-login')
    process.exit(0)
  }

  // 3. Interactive prompt
  console.log('Select an option:')
  console.log('1. Provision the initial 6 administrative accounts in MongoDB (Recommended)')
  console.log('2. Create / update a custom single administrator account interactively')
  console.log('3. Exit\n')

  const choice = await promptUser('Enter choice (1/2/3) [Default 1]: ')

  if (choice === '2') {
    const email = await promptUser('Admin Email: ')
    if (!email) {
      console.error('❌ Email cannot be empty.')
      process.exit(1)
    }

    const name = await promptUser('Admin Full Name: ')
    const password = await promptUser('Admin Password (min 8 chars): ')

    if (!password || password.length < 8) {
      console.error('❌ Password must be at least 8 characters long.')
      process.exit(1)
    }

    await upsertAdmin({ name, email, password })
    console.log('\n✔ Interactive admin account setup complete in MongoDB!')
    process.exit(0)
  } else if (choice === '3') {
    console.log('Exiting.')
    process.exit(0)
  } else {
    for (const a of initialAdmins) {
      await upsertAdmin({
        id: a.id,
        name: a.name,
        email: a.email,
        password: defaultPassword,
      })
    }
    console.log('\n✔ Initial 6 admin accounts provisioned idempotently in MongoDB.')
    process.exit(0)
  }
}

run().catch((err) => {
  console.error('❌ Error seeding admin accounts in MongoDB:', err)
  process.exit(1)
})
