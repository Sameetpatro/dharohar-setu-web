import config from '../config.js'

const BASE_URL = config.remoteBackendUrl

async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    })
    if (!res.ok) {
      const text = await res.text()
      return { ok: false, status: res.status, errorText: text }
    }
    const data = await res.json()
    return { ok: true, status: res.status, data }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

export const remoteBackend = {
  // 1. GET /sites/nearby?lat=&lng=&max_range_km=
  async getNearbySites(lat = 28.5245, lng = 77.1855, maxRangeKm = 1000) {
    const url = `${BASE_URL}/sites/nearby?lat=${lat}&lng=${lng}&max_range_km=${maxRangeKm}`
    return safeFetch(url)
  },

  // 2. GET /sites/{site_id}
  async getSiteDetails(siteId) {
    const url = `${BASE_URL}/sites/${siteId}`
    return safeFetch(url)
  },

  // 3. GET /sites/{site_id}/nodes
  async getSiteNodes(siteId) {
    const url = `${BASE_URL}/sites/${siteId}/nodes`
    return safeFetch(url)
  },

  // 4. GET /sites/scan/{qr_value}
  async scanQr(qrValue) {
    const url = `${BASE_URL}/sites/scan/${encodeURIComponent(qrValue)}`
    return safeFetch(url)
  },

  // 5. GET /sites/{site_id}/recommendations
  async getSiteRecommendations(siteId) {
    const url = `${BASE_URL}/sites/${siteId}/recommendations`
    return safeFetch(url)
  },

  // 6. GET /stats/live
  async getLiveStats() {
    const url = `${BASE_URL}/stats/live`
    return safeFetch(url)
  },

  // 6b. GET /admin/dashboard/stats
  async getDashboardStats() {
    const url = `${BASE_URL}/admin/dashboard/stats`
    return safeFetch(url)
  },

  // 7. GET /insights/sites/{site_id}
  async getSiteInsights(siteId) {
    const url = `${BASE_URL}/insights/sites/${siteId}`
    return safeFetch(url)
  },

  // 8. POST /chat/
  async chat(payload) {
    const url = `${BASE_URL}/chat/`
    return safeFetch(url, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  // 9. POST /admin/seed-prompt
  async seedPrompt(payload) {
    const url = `${BASE_URL}/admin/seed-prompt`
    return safeFetch(url, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  // 10. POST /admin/seed-bulk
  async seedBulk(payload) {
    const url = `${BASE_URL}/admin/seed-bulk`
    return safeFetch(url, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}

export default remoteBackend
