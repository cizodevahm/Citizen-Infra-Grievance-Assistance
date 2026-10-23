/**
 * Centralized API configuration and service client
 * Citizen Infrastructure Grievance Assistance
 */

// Base Backend API URL from environment variables
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// All API Endpoints defined in one common dictionary
export const API_ENDPOINTS = {
  AUTH_LOGIN: `${API_BASE_URL}/api/auth/login`,
  COMPLAINTS: `${API_BASE_URL}/api/complaints`,
  TRACK_COMPLAINT: (trackingId) =>
    `${API_BASE_URL}/api/complaints/track/${encodeURIComponent(trackingId)}`,
  ADMIN_STATS: `${API_BASE_URL}/api/admin/dashboard/stats`,
  COMPLAINTS_LIST: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page != null) searchParams.set("page", String(params.page));
    if (params.limit != null) searchParams.set("limit", String(params.limit));
    if (params.sort_by) searchParams.set("sort_by", String(params.sort_by));
    if (params.order) searchParams.set("order", String(params.order));
    if (params.status && params.status !== "all")
      searchParams.set("status", String(params.status));
    if (params.category && params.category !== "all")
      searchParams.set("category", String(params.category));
    const qs = searchParams.toString();
    return `${API_BASE_URL}/api/complaints${qs ? `?${qs}` : ""}`;
  },
  UPDATE_COMPLAINT_STATUS: (trackingId) =>
    `${API_BASE_URL}/api/complaints/${encodeURIComponent(trackingId)}/status`,
  DELETE_COMPLAINT: (trackingId) =>
    `${API_BASE_URL}/api/complaints/${encodeURIComponent(trackingId)}`,
  MAP_POINTS: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.min_lat != null)
      searchParams.set("min_lat", String(params.min_lat));
    if (params.max_lat != null)
      searchParams.set("max_lat", String(params.max_lat));
    if (params.min_lng != null)
      searchParams.set("min_lng", String(params.min_lng));
    if (params.max_lng != null)
      searchParams.set("max_lng", String(params.max_lng));
    const qs = searchParams.toString();
    return `${API_BASE_URL}/api/map/points${qs ? `?${qs}` : ""}`;
  },
};

/**
 * Retrieve the current authenticated user's access token from localStorage.
 *
 * @returns {string|null} Bearer access token if available, otherwise null.
 */
export function getAuthToken() {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("ciga_token");
  if (token && typeof token === "string" && token.trim()) {
    return token.trim();
  }
  try {
    const rawUser = localStorage.getItem("ciga_user");
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed?.access_token && typeof parsed.access_token === "string") {
        return parsed.access_token.trim();
      }
    }
  } catch {
    // Ignore JSON parse errors
  }
  return null;
}

/**
 * Helper to construct authentication headers using Bearer token.
 *
 * @param {string|null} [token] Optional token override
 * @param {Object} [extraHeaders] Additional headers to include
 * @returns {Object} Headers object with Authorization if token is available
 */
function getAuthHeaders(token = null, extraHeaders = {}) {
  const authToken = token || getAuthToken();
  const headers = { ...extraHeaders };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  return headers;
}

/**
 * Submit a new grievance/complaint to the backend (Public citizen endpoint).
 *
 * Compulsory fields:
 *  - image: File (Image of the civic issue)
 *  - lat: number | string (Latitude)
 *  - lng: number | string (Longitude)
 *
 * Optional fields:
 *  - text: string (Description)
 *  - audio: File | Blob (Voice note recording)
 *
 * @param {Object} params
 * @param {File|Blob} params.image
 * @param {number|string} params.lat
 * @param {number|string} params.lng
 * @param {string} [params.text]
 * @param {File|Blob} [params.audio]
 * @returns {Promise<Object>} API response object { success: true, data: { ... } }
 */
export async function submitComplaint({ image, lat, lng, text, audio }) {
  if (!image) {
    throw new Error("An image is required to file a complaint.");
  }

  if (lat === undefined || lat === null || lng === undefined || lng === null) {
    throw new Error("Location coordinates (lat and lng) are required.");
  }

  const formData = new FormData();
  formData.append("image", image);
  formData.append("lat", String(lat));
  formData.append("lng", String(lng));

  if (text && typeof text === "string" && text.trim()) {
    formData.append("text", text.trim());
  }

  if (audio) {
    formData.append("audio", audio);
  }

  const response = await fetch(API_ENDPOINTS.COMPLAINTS, {
    method: "POST",
    body: formData,
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.success) {
    const errorMsg =
      result?.error?.message ||
      result?.error ||
      result?.message ||
      `Submission failed (${response.status})`;
    throw new Error(errorMsg);
  }

  return result;
}

/**
 * Track an existing complaint status and history by tracking ID (Public citizen endpoint).
 *
 * @param {string} trackingId e.g. "RIF-7NRGN7"
 * @returns {Promise<Object>} API response object { success: true, data: { ... } }
 */
export async function trackComplaint(trackingId) {
  if (!trackingId || !trackingId.trim()) {
    throw new Error("A tracking ID is required to track a complaint.");
  }

  const cleanId = trackingId.trim();
  const response = await fetch(API_ENDPOINTS.TRACK_COMPLAINT(cleanId), {
    method: "GET",
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.success) {
    const errorMsg =
      result?.error?.message ||
      result?.error ||
      result?.message ||
      `Tracking request failed (${response.status})`;
    throw new Error(errorMsg);
  }

  return result;
}

/**
 * Fetch aggregated admin dashboard statistics and metrics (Protected endpoint).
 *
 * @param {string} [token=null] Optional Bearer token override
 * @returns {Promise<Object>} API response object { success: true, data: { ... } }
 */
export async function getAdminDashboardStats(token = null) {
  const response = await fetch(API_ENDPOINTS.ADMIN_STATS, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.success) {
    const errorMsg =
      result?.error?.message ||
      result?.error ||
      result?.message ||
      `Failed to fetch dashboard stats (${response.status})`;
    throw new Error(errorMsg);
  }

  return result;
}

/**
 * Fetch paginated and filtered complaints list from the backend (Protected endpoint).
 *
 * @param {Object} [params]
 * @param {number} [params.page=1]
 * @param {number} [params.limit=10]
 * @param {string} [params.sort_by="created_at"]
 * @param {string} [params.order="desc"]
 * @param {string} [params.status]
 * @param {string} [params.category]
 * @param {string} [token=null] Optional Bearer token override
 * @returns {Promise<Object>} API response object { success: true, data: [...], meta: { ... } }
 */
export async function getComplaintsList(params = {}, token = null) {
  const url = API_ENDPOINTS.COMPLAINTS_LIST(params);
  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.success) {
    const errorMsg =
      result?.error?.message ||
      result?.error ||
      result?.message ||
      `Failed to fetch complaints list (${response.status})`;
    throw new Error(errorMsg);
  }

  // If raw_text exists, set user_message to raw_text
  if (result.success && Array.isArray(result.data)) {
    result.data = result.data.map((item) => ({
      ...item,
      user_message: item.raw_text || item.user_message,
    }));
  }

  return result;
}

/**
 * Update the status of an existing complaint by tracking ID (Protected endpoint).
 *
 * Supported status values: "pending", "processing", "completed"
 *
 * @param {string} trackingId e.g. "RIF-6DMEXS"
 * @param {string} status e.g. "completed"
 * @param {string} [changedBy="admin"]
 * @param {string} [token=null] Optional Bearer access token (automatically resolved from localStorage if omitted)
 * @returns {Promise<Object>} API response object { success: true, data: { ... } }
 */
export async function updateComplaintStatus(
  trackingId,
  status,
  changedBy = "admin",
  token = null,
) {
  if (!trackingId || !trackingId.trim()) {
    throw new Error("A tracking ID is required to update status.");
  }
  if (!status || !status.trim()) {
    throw new Error("A status value is required.");
  }

  const cleanId = trackingId.trim();
  const response = await fetch(API_ENDPOINTS.UPDATE_COMPLAINT_STATUS(cleanId), {
    method: "PATCH",
    headers: getAuthHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      status: status.trim().toLowerCase(),
      changed_by: changedBy || "admin",
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.success) {
    const errorMsg =
      result?.error?.message ||
      result?.error ||
      result?.message ||
      `Failed to update complaint status (${response.status})`;
    throw new Error(errorMsg);
  }

  return result;
}

/**
 * Delete a complaint by tracking ID with reason and attribution (Protected endpoint).
 *
 * @param {string} trackingId e.g. "RIF-U7MPBU"
 * @param {string} reason Reason for deletion, e.g. "duplicate report"
 * @param {string} [deletedBy="admin"] Name or identifier of the user deleting
 * @param {string} [token=null] Optional Bearer access token (automatically resolved from localStorage if omitted)
 * @returns {Promise<Object>} API response object { success: true, data: { ... } }
 */
export async function deleteComplaint(
  trackingId,
  reason,
  deletedBy = "admin",
  token = null,
) {
  if (!trackingId || !trackingId.trim()) {
    throw new Error("A tracking ID is required to delete a complaint.");
  }
  if (!reason || !reason.trim()) {
    throw new Error("Please provide a reason for deleting this complaint.");
  }

  const cleanId = trackingId.trim();
  const response = await fetch(API_ENDPOINTS.DELETE_COMPLAINT(cleanId), {
    method: "DELETE",
    headers: getAuthHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      deleted_by: deletedBy || "admin",
      reason: reason.trim(),
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.success) {
    const errorMsg =
      result?.error?.message ||
      result?.error ||
      result?.message ||
      `Failed to delete complaint (${response.status})`;
    throw new Error(errorMsg);
  }

  return result;
}

/**
 * Fetch map points and hotspots for civic incidents with optional bounding coordinates (Protected endpoint).
 *
 * @param {Object} [params]
 * @param {number|string} [params.min_lat]
 * @param {number|string} [params.max_lat]
 * @param {number|string} [params.min_lng]
 * @param {number|string} [params.max_lng]
 * @param {string} [token=null] Optional Bearer token override
 * @returns {Promise<Object>} API response object { success: true, data: [...], meta: {...}, hotspots: [...] }
 */
export async function getMapPoints(params = {}, token = null) {
  const url = API_ENDPOINTS.MAP_POINTS(params);
  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.success) {
    const errorMsg =
      result?.error?.message ||
      result?.error ||
      result?.message ||
      `Failed to fetch map points (${response.status})`;
    throw new Error(errorMsg);
  }

  return result;
}

/**
 * Authenticate administrative user via Backend Login API (Public endpoint).
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>} API response object { success: true, data: { user: {...}, access_token: "...", token_type: "Bearer", expires_in: ... } }
 */
export async function loginAdmin(email, password) {
  if (!email || !email.trim()) {
    throw new Error("A valid email address is required.");
  }
  if (!password) {
    throw new Error("Password is required.");
  }

  const response = await fetch(API_ENDPOINTS.AUTH_LOGIN, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email.trim(),
      password,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.success) {
    const errorMsg =
      result?.error?.message ||
      result?.error ||
      result?.message ||
      `Authentication failed (${response.status})`;
    throw new Error(errorMsg);
  }

  return result;
}
