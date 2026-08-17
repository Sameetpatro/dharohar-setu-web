import http from 'http'
import app from '../index.js'
import { connectDB } from '../db/mongodb.js'
import { seedInitialData } from '../db/seed-data.js'

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
  console.log('  DHAROHAR BACKEND & ADMIN PORTAL API TEST SUITE (MONGODB)')
  console.log('========================================================\n')

  await connectDB()
  await seedInitialData()

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
      email: 'admin@dharohar.app',
      password: 'WrongPassword123!',
    })
    assert('Reject invalid admin password (401)', badLogin.status === 401)

    // 3. Auth: Normal user attempting admin login
    const userLogin = await makeRequest('/api/auth/login', { method: 'POST' }, {
      email: 'aarav.sharma@example.com',
      password: 'TouristPass@2026',
    })
    assert('Reject non-admin user role (403)', userLogin.status === 403 && userLogin.data.error === 'AccessDenied')

    // 4. Auth: Successful Admin Login
    const adminLogin = await makeRequest('/api/auth/login', { method: 'POST' }, {
      email: 'admin@dharohar.app',
      password: 'DharoharAdmin@2026',
    })
    assert('Admin Login Success in MongoDB (200 + JWT token)', adminLogin.status === 200 && !!adminLogin.data.token && adminLogin.data.user.role === 'ADMIN')

    const adminToken = adminLogin.data.token
    const authHeaders = { Authorization: `Bearer ${adminToken}` }

    // 5. Auth: /api/auth/me
    const me = await makeRequest('/api/auth/me', { headers: authHeaders })
    assert('Admin Session Verification (/api/auth/me)', me.status === 200 && me.data.user.email === 'admin@dharohar.app')

    // 6. Auth: Forgot Password & Reset Flow
    const forgot = await makeRequest('/api/auth/forgot-password', { method: 'POST' }, {
      email: 'heritage.curator@dharohar.app',
    })
    assert('Forgot Password Token Dispatch in MongoDB', forgot.status === 200 && !!forgot.data.resetLink)

    // Extract token from resetLink
    const rawToken = forgot.data.resetLink.split('token=')[1]
    const reset = await makeRequest('/api/auth/reset-password', { method: 'POST' }, {
      token: rawToken,
      newPassword: 'NewCuratorPassword@2026',
    })
    assert('Reset Password with Single-Use Token in MongoDB', reset.status === 200 && reset.data.success === true)

    // Verify token cannot be reused
    const reuseReset = await makeRequest('/api/auth/reset-password', { method: 'POST' }, {
      token: rawToken,
      newPassword: 'AnotherPassword@2026',
    })
    assert('Prevent Replay/Reuse of Password Reset Token (400)', reuseReset.status === 400)

    // Verify login with new password
    const curatorLogin = await makeRequest('/api/auth/login', { method: 'POST' }, {
      email: 'heritage.curator@dharohar.app',
      password: 'NewCuratorPassword@2026',
    })
    assert('Log in with newly reset admin password', curatorLogin.status === 200)

    // 7. Sites API: Nearby (Live + MongoDB)
    const nearby = await makeRequest('/sites/nearby?lat=28.5245&lng=77.1855&max_range_km=1000')
    assert('GET /sites/nearby (Live remote + MongoDB proximity search)', nearby.status === 200 && Array.isArray(nearby.data.sites) && nearby.data.sites.length > 0)

    // 8. Sites API: Detail
    const siteDetail = await makeRequest('/sites/SITE-001')
    assert('GET /sites/:site_id (Full site details + nodes + images)', siteDetail.status === 200 && (siteDetail.data.id === 'SITE-001' || siteDetail.data.name))

    // 9. Sites API: Nodes
    const nodes = await makeRequest('/sites/SITE-001/nodes')
    assert('GET /sites/:site_id/nodes (Directions map nodes)', nodes.status === 200 && nodes.data.total_nodes >= 1)

    // 10. Sites API: Scan QR
    const scan = await makeRequest('/sites/scan/QTB-0-KING')
    assert('GET /sites/scan/:qr_value (QR marker validation)', scan.status === 200 && (scan.data.valid === true || scan.data.is_king !== undefined))

    // 11. Sites API: Recommendations
    const recs = await makeRequest('/sites/SITE-001/recommendations')
    assert('GET /sites/:site_id/recommendations', recs.status === 200 && (recs.data.recommendations !== undefined || Array.isArray(recs.data)))

    // 12. Trips API: Start Trip
    const startTrip = await makeRequest('/trips/start', { method: 'POST' }, {
      user_id: 'USR-108',
      qr_value: 'QTB-0-KING',
    })
    assert('POST /trips/start (Start guided tour session)', startTrip.status === 200 || startTrip.status === 201)

    const tripId = startTrip.data.trip ? startTrip.data.trip.tripId || startTrip.data.trip.id : 'TRIP-9001'

    // 13. Trips API: End Trip
    const endTrip = await makeRequest('/trips/end', { method: 'POST' }, {
      trip_id: tripId,
    })
    assert('POST /trips/end (Conclude trip in MongoDB and record duration)', endTrip.status === 200 && endTrip.data.success === true)

    // 14. Reviews API: Submit Review
    const submitRev = await makeRequest('/reviews/submit', { method: 'POST' }, {
      site_id: 'SITE-001',
      user_id: 'USR-108',
      rating: 5,
      q1_clarity: 5,
      q2_accessibility: 5,
      q3_overall: 5,
      comment: 'Superb tour flow and wonderful audio stories.',
    })
    assert('POST /reviews/submit (3-Question survey rating in MongoDB)', submitRev.status === 201 && submitRev.data.review.rating === 5)

    // 15. Reviews API: Summary
    const revSummary = await makeRequest('/reviews/sites/SITE-001/summary')
    assert('GET /reviews/sites/:site_id/summary (Aggregate analytics & question metrics)', revSummary.status === 200 && !!revSummary.data.question_metrics.q1_information_clarity)

    // 16. AI Chat API
    const chat = await makeRequest('/chat', { method: 'POST' }, {
      site_id: 'SITE-001',
      message: 'Why does the iron pillar not rust?',
    })
    assert('POST /chat/ (AI text chat with site context)', chat.status === 200 && (chat.data.reply || chat.data.response))

    // 17. AI Voice Chat API
    const voice = await makeRequest('/voice-chat', { method: 'POST' }, {
      site_id: 'SITE-001',
      language: 'en',
    })
    assert('POST /voice-chat (Voice pipeline simulation)', voice.status === 200 && !!voice.data.audio_url)

    // 18. Admin Content: Seed Prompt
    const seedPrompt = await makeRequest('/admin/seed-prompt', { method: 'POST', headers: authHeaders }, {
      site_id: 'SITE-001',
      prompt_text: 'You are the Dharohar Chief Architect Guide for Qutub Minar.',
      language: 'en',
      system_context: 'Focus on 12th century Indo-Islamic epigraphy and stonework.',
    })
    assert('POST /admin/seed-prompt (Configure AI context prompt in MongoDB)', seedPrompt.status === 200 && seedPrompt.data.success === true)

    // 19. Admin Content: Seed Bulk
    const seedBulk = await makeRequest('/admin/seed-bulk', { method: 'POST', headers: authHeaders }, {
      site: {
        id: 'SITE-TEST-01',
        name: 'Test Heritage Fort',
        location: 'Jaipur, Rajasthan',
        qr_value: 'test-fort-entrance',
      },
      nodes: [
        { name: 'Gateway', node_type: 'king', qr_value: 'test-fort-entrance' },
        { name: 'Palace Courtyard', node_type: 'poi', qr_value: 'test-fort-palace' },
      ],
      recommendations: [
        { name: 'Fort Cafe', category: 'restaurant', distance_km: 0.2, rating: 4.6 }
      ]
    })
    assert('POST /admin/seed-bulk (Bulk site & node ingestion in MongoDB)', seedBulk.status === 201 && seedBulk.data.nodes_count === 2)

    // 20. Admin Dashboard: Stats
    const stats = await makeRequest('/api/admin/dashboard/stats', { headers: authHeaders })
    assert('GET /api/admin/dashboard/stats (Aggregated MongoDB metrics & live telemetry)', stats.status === 200 && stats.data.stats.total_sites >= 4)

    // 21. Admin Trips & Users
    const adminTrips = await makeRequest('/api/admin/trips', { headers: authHeaders })
    assert('GET /api/admin/trips (Admin trips registry in MongoDB)', adminTrips.status === 200 && adminTrips.data.count > 0)

    const adminUsers = await makeRequest('/api/admin/users', { headers: authHeaders })
    assert('GET /api/admin/users (Admin users directory in MongoDB)', adminUsers.status === 200 && adminUsers.data.count > 0)

    // 22. Admin Settings
    const settings = await makeRequest('/api/admin/settings', { headers: authHeaders })
    assert('GET /api/admin/settings (System diagnostics & MongoDB admin registry)', settings.status === 200 && settings.data.active_admins.total >= 6)

  } catch (err) {
    console.error('Test execution error:', err)
    failed++
  } finally {
    if (server) server.close()
  }

  console.log('\n========================================================')
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('========================================================\n')

  if (failed > 0) process.exit(1)
  process.exit(0)
}

runTests()
