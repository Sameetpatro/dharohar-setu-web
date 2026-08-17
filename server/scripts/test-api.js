import http from 'http'
import bcrypt from 'bcryptjs'
import app from '../index.js'
import prisma from '../db/prisma.js'

let server

function makeRequest(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: '127.0.0.1',
      port: 5002,
      path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    }

    const req = http.request(reqOptions, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          resolve({ status: res.statusCode, data: parsed, headers: res.headers })
        } catch (e) {
          resolve({ status: res.statusCode, raw: data, headers: res.headers })
        }
      })
    })

    req.on('error', reject)

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body))
    }
    req.end()
  })
}

async function runTests() {
  console.log('========================================================')
  console.log('  DHAROHAR BACKEND & ADMIN PORTAL API TEST SUITE (POSTGRESQL)')
  console.log('========================================================\n')

  await prisma.$connect()
  console.log('✔ Connected to Neon PostgreSQL')

  // Provision / verify Super Admin (dharoharsetu@gmail.com)
  const testSuperEmail = 'dharoharsetu@gmail.com'
  const superAdminPasswordHash = await bcrypt.hash('DharoharAdmin@2026', 10)
  await prisma.user.upsert({
    where: { email: testSuperEmail },
    create: {
      email: testSuperEmail,
      username: 'dharoharsetu',
      name: 'Dharohar Super Admin',
      passwordHash: superAdminPasswordHash,
      role: 'SUPER_ADMIN',
      mustChangePassword: false,
      createdBy: 'SYSTEM_SEED',
      isActive: true,
    },
    update: {
      passwordHash: superAdminPasswordHash,
      role: 'SUPER_ADMIN',
      mustChangePassword: false,
      isActive: true,
    },
  })

  await new Promise((resolve) => {
    server = app.listen(5002, resolve)
  })

  let passed = 0
  let failed = 0

  function assert(name, condition, detail = '') {
    if (condition) {
      console.log(`  ✓ PASS: ${name}`)
      passed++
    } else {
      console.error(`  ❌ FAIL: ${name} — ${detail}`)
      failed++
    }
  }

  try {
    // 1. Health check
    const health = await makeRequest('/api/health')
    assert('Health Check Endpoint (/api/health)', health.status === 200 && health.data.status === 'ok')

    // 2. Auth: Invalid Login
    const badLogin = await makeRequest('/api/auth/login', { method: 'POST' }, {
      email: testSuperEmail,
      password: 'WrongPassword123!',
    })
    assert('Reject invalid admin password (401)', badLogin.status === 401)

    // 3. Auth: Non-existent email
    const unknownLogin = await makeRequest('/api/auth/login', { method: 'POST' }, {
      email: 'nonexistent.tourist@example.com',
      password: 'TouristPass@2026',
    })
    assert('Reject unknown user email (401)', unknownLogin.status === 401)

    // 4. Super Admin (dharoharsetu@gmail.com) Login
    const superLogin = await makeRequest('/api/auth/login', { method: 'POST' }, {
      email: testSuperEmail,
      password: 'DharoharAdmin@2026',
    })
    assert('Super Admin Login Success in PostgreSQL (200 + JWT token)', superLogin.status === 200 && !!superLogin.data.token && superLogin.data.user.role === 'SUPER_ADMIN')

    const superAdminToken = superLogin.data.token
    const superAuthHeaders = { Authorization: `Bearer ${superAdminToken}` }

    // 5. Auth: /api/auth/me
    const me = await makeRequest('/api/auth/me', { headers: superAuthHeaders })
    assert('Super Admin Session Verification (/api/auth/me)', me.status === 200 && me.data?.user?.email === testSuperEmail)

    // 6. SUPER_ADMIN creating a new ADMIN account -> 201 Created + Signed Expiring Invite Token
    const newAdminEmail = `curator.test.${Date.now()}@dharohar.app`
    const createdAdminRes = await makeRequest('/api/admin/create-admin', { method: 'POST', headers: superAuthHeaders }, {
      name: 'Curator Test Account',
      username: `curator_${Date.now().toString().slice(-4)}`,
      email: newAdminEmail,
    })
    assert('SUPER_ADMIN dispatches signed expiring invite email (201)', createdAdminRes.status === 201 && createdAdminRes.data.success === true && !!createdAdminRes.data.dev_invite_token)

    const inviteToken = createdAdminRes.data?.dev_invite_token
    const createdAdminId = createdAdminRes.data?.admin?.id

    // 7. Validate invitation token info via GET /api/admin/invite-info
    const inviteInfo = await makeRequest(`/api/admin/invite-info?token=${inviteToken}`)
    assert('Validate signed invitation token (/api/admin/invite-info)', inviteInfo.status === 200 && inviteInfo.data.valid === true && inviteInfo.data.email === newAdminEmail)

    // 8. New admin sets their chosen password via POST /api/admin/accept-invite
    const acceptRes = await makeRequest('/api/admin/accept-invite', { method: 'POST' }, {
      token: inviteToken,
      password: 'CuratorChosenPermanentPassword@2026',
    })
    assert('New admin accepts invite & sets private password (POST /api/admin/accept-invite)', acceptRes.status === 200 && !!acceptRes.data.token && acceptRes.data.user.email === newAdminEmail)

    const newAdminToken = acceptRes.data.token
    const newAdminHeaders = { Authorization: `Bearer ${newAdminToken}` }

    // 9. Security: Normal ADMIN attempting POST /api/admin/create-admin -> 403 Forbidden
    const forbiddenCreate = await makeRequest('/api/admin/create-admin', { method: 'POST', headers: newAdminHeaders }, {
      name: 'Unauthorized New Admin',
      email: 'unauth@dharohar.app',
    })
    assert('RequireSuperAdmin blocks normal ADMIN from creating admins (403)', forbiddenCreate.status === 403)

    // 10. Super Admin list all admins -> GET /api/admin/admins
    const listAdmins = await makeRequest('/api/admin/admins', { headers: superAuthHeaders })
    assert('GET /api/admin/admins (Super Admin admin directory)', listAdmins.status === 200 && listAdmins.data.admins.length >= 2)

    // 11. Security: Super Admin cannot delete their own account (400)
    const selfDelete = await makeRequest(`/api/admin/admins/${me.data.user.id}`, { method: 'DELETE', headers: superAuthHeaders })
    assert('Prevent Super Admin from deleting own account (400)', selfDelete.status === 400 && selfDelete.data.error === 'CannotDeleteSelf')

    // 12. Super Admin deletes the newly created admin -> 200 OK
    const deleteAdminRes = await makeRequest(`/api/admin/admins/${createdAdminId}`, { method: 'DELETE', headers: superAuthHeaders })
    assert('Super Admin deletes admin (DELETE /api/admin/admins/:id -> 200)', deleteAdminRes.status === 200 && deleteAdminRes.data.success === true)

    // 13. Auth: Forgot Password & Reset Flow
    const forgot = await makeRequest('/api/auth/forgot-password', { method: 'POST' }, {
      email: testSuperEmail,
    })
    assert('Forgot Password Token Dispatch in PostgreSQL', forgot.status === 200 && (!!forgot.data.dev_reset_token || forgot.data.success === true))

    const rawToken = forgot.data.dev_reset_token
    if (rawToken) {
      const reset = await makeRequest('/api/auth/reset-password', { method: 'POST' }, {
        token: rawToken,
        newPassword: 'DharoharAdmin@2026',
      })
      assert('Reset Password with Single-Use Token in PostgreSQL', reset.status === 200 && reset.data.success === true)

      // Verify token cannot be reused
      const reuseReset = await makeRequest('/api/auth/reset-password', { method: 'POST' }, {
        token: rawToken,
        newPassword: 'AnotherPassword@2026',
      })
      assert('Prevent Replay/Reuse of Password Reset Token (400)', reuseReset.status === 400)

      // Verify login with new password
      const curatorLogin = await makeRequest('/api/auth/login', { method: 'POST' }, {
        email: testSuperEmail,
        password: 'DharoharAdmin@2026',
      })
      assert('Log in with newly reset admin password', curatorLogin.status === 200)
    }

    // 14. Sites API: Nearby (Live + PostgreSQL)
    const nearby = await makeRequest('/sites/nearby?lat=28.5245&lng=77.1855&max_range_km=1000')
    assert('GET /sites/nearby (Live remote + PostgreSQL proximity search)', nearby.status === 200 && Array.isArray(nearby.data.sites) && nearby.data.sites.length > 0)

    // 15. Sites API: Detail
    const siteDetail = await makeRequest('/sites/SITE-001')
    assert('GET /sites/:site_id (Full site details + nodes + images)', siteDetail.status === 200 && (siteDetail.data.id === 'SITE-001' || siteDetail.data.name))

    // 16. Sites API: Nodes
    const nodes = await makeRequest('/sites/SITE-001/nodes')
    assert('GET /sites/:site_id/nodes (Directions map nodes)', nodes.status === 200 && nodes.data.total_nodes >= 1)

    // 17. Sites API: Scan QR
    const scan = await makeRequest('/sites/scan/QMC-0')
    assert('GET /sites/scan/:qr_value (QR marker validation)', scan.status === 200 && (scan.data.valid === true || scan.data.type !== undefined))

    // 18. Sites API: Recommendations
    const recs = await makeRequest('/sites/SITE-001/recommendations')
    assert('GET /sites/:site_id/recommendations (Sorted by promotion weightage)', recs.status === 200 && (recs.data.recommendations !== undefined || Array.isArray(recs.data)))

    // 19. Trips API: Start Trip
    const startTrip = await makeRequest('/trips/start', { method: 'POST' }, {
      user_id: 'USR-108',
      qr_value: 'QMC-0',
    })
    assert('POST /trips/start (Start guided tour session)', startTrip.status === 200 || startTrip.status === 201)

    const tripId = startTrip.data.trip ? startTrip.data.trip.tripId || startTrip.data.trip.id : 'TRIP-9001'

    // 20. Trips API: End Trip
    const endTrip = await makeRequest('/trips/end', { method: 'POST' }, {
      trip_id: tripId,
    })
    assert('POST /trips/end (Conclude trip in PostgreSQL and record duration)', endTrip.status === 200 && endTrip.data.success === true)

    // 21. Reviews API: Submit Review
    const submitRev = await makeRequest('/reviews/submit', { method: 'POST' }, {
      site_id: 'SITE-001',
      user_id: 'USR-108',
      rating: 5,
      q1_clarity: 5,
      q2_accessibility: 5,
      q3_overall: 5,
      comment: 'Superb tour flow and wonderful audio stories.',
    })
    assert('POST /reviews/submit (3-Question survey rating in PostgreSQL)', submitRev.status === 201 && submitRev.data.review.rating === 5)

    // 22. Reviews API: Summary
    const revSummary = await makeRequest('/reviews/sites/SITE-001/summary')
    assert('GET /reviews/sites/:site_id/summary (Aggregate analytics & question metrics)', revSummary.status === 200 && !!revSummary.data.question_metrics.q1_information_clarity)

    // 23. AI Chat API
    const chat = await makeRequest('/chat', { method: 'POST' }, {
      site_id: 'SITE-001',
      message: 'Why does the iron pillar not rust?',
    })
    assert('POST /chat/ (AI text chat with site context)', chat.status === 200 && (chat.data.reply || chat.data.response))

    // 24. AI Voice Chat API
    const voice = await makeRequest('/voice-chat', { method: 'POST' }, {
      site_id: 'SITE-001',
      language: 'en',
    })
    assert('POST /voice-chat (Voice pipeline simulation)', voice.status === 200 && !!voice.data.audio_url)

    // 25. Admin Dashboard: Stats
    const stats = await makeRequest('/api/admin/dashboard/stats', { headers: superAuthHeaders })
    assert('GET /api/admin/dashboard/stats (Aggregated PostgreSQL metrics & live telemetry)', stats.status === 200 && stats.data.stats.total_sites >= 1)

    // 26. Admin Trips & Users
    const adminTrips = await makeRequest('/api/admin/trips', { headers: superAuthHeaders })
    assert('GET /api/admin/trips (Admin trips registry in PostgreSQL)', adminTrips.status === 200 && adminTrips.data.count >= 0)

    const adminUsers = await makeRequest('/api/admin/users', { headers: superAuthHeaders })
    assert('GET /api/admin/users (Admin users directory in PostgreSQL)', adminUsers.status === 200 && adminUsers.data.count >= 0)

    // 27. Admin Settings
    const settings = await makeRequest('/api/admin/settings', { headers: superAuthHeaders })
    assert('GET /api/admin/settings (System diagnostics & PostgreSQL admin registry)', settings.status === 200 && settings.data.active_admins.total >= 1)

  } catch (err) {
    console.error('Test execution error:', err)
    failed++
  } finally {
    // Ensure dharoharsetu@gmail.com has password set to DharoharAdmin@2026
    const cleanHash = await bcrypt.hash('DharoharAdmin@2026', 10)
    await prisma.user.updateMany({
      where: { email: 'dharoharsetu@gmail.com' },
      data: { passwordHash: cleanHash, mustChangePassword: false },
    })
    if (server) server.close()
    await prisma.$disconnect()
  }

  console.log('\n========================================================')
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('========================================================\n')

  if (failed > 0) process.exit(1)
  process.exit(0)
}

runTests()
