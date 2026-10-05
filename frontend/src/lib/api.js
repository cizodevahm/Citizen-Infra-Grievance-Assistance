/**
 * Centralized API configuration and service client
 * Citizen Infrastructure Grievance Assistance
 */

// Base Backend API URL from environment variables
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://18.145.114.24";

// API Keys from environment variables
export const API_KEYS = {
  COMPLAINTS:
    process.env.NEXT_PUBLIC_COMPLAINTS_API_KEY ||
    "e5q2V2sJkkdEQUXe_-ETzy3UjrQreotz8QrT5gcHqKU",
  TRACKING:
    process.env.NEXT_PUBLIC_TRACKING_API_KEY ||
    "AwH0IukvjtwAc9lqpJ8MWrj2QZkIQ6MLKsww0Qoqs5g",
  ADMIN:
    process.env.NEXT_PUBLIC_ADMIN_API_KEY ||
    "h7Dn_V0HqYBAKbdaACWVET3DAmVsbsuxoNKiOKjtx3s",
  COMPLAINTS_LIST:
    process.env.NEXT_PUBLIC_COMPLAINTS_LIST_API_KEY ||
    "l5VlqCYhtC9OCLT-3ifm0yJzciW-Yd6NV7mQ-48t2zk",
  UPDATE_STATUS:
    process.env.NEXT_PUBLIC_UPDATE_STATUS_API_KEY ||
    "v8ZLmsO6PefwCOTx7RpTY9aPJunrKJP4my1vzVpB5zY",
};

// All API Endpoints defined in one common dictionary
export const API_ENDPOINTS = {
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
};

/**
 * Submit a new grievance/complaint to the backend.
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
    headers: {
      "X-API-Key": API_KEYS.COMPLAINTS,
    },
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
 * Track an existing complaint status and history by tracking ID.
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
    headers: {
      "X-API-Key": API_KEYS.TRACKING,
    },
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
 * Fetch aggregated admin dashboard statistics and metrics.
 *
 * @returns {Promise<Object>} API response object { success: true, data: { ... } }
 */
export async function getAdminDashboardStats() {
  const response = await fetch(API_ENDPOINTS.ADMIN_STATS, {
    method: "GET",
    headers: {
      "X-API-Key": API_KEYS.ADMIN,
    },
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
 * Fetch paginated and filtered complaints list from the backend.
 *
 * @param {Object} [params]
 * @param {number} [params.page=1]
 * @param {number} [params.limit=10]
 * @param {string} [params.sort_by="created_at"]
 * @param {string} [params.order="desc"]
 * @param {string} [params.status]
 * @param {string} [params.category]
 * @returns {Promise<Object>} API response object { success: true, data: [...], meta: { ... } }
 */
export async function getComplaintsList(params = {}) {
  const url = API_ENDPOINTS.COMPLAINTS_LIST(params);
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-API-Key": API_KEYS.COMPLAINTS_LIST,
    },
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
 * Update the status of an existing complaint by tracking ID.
 *
 * Supported status values: "pending", "processing", "completed"
 *
 * @param {string} trackingId e.g. "RIF-6DMEXS"
 * @param {string} status e.g. "completed"
 * @param {string} [changedBy="admin"]
 * @returns {Promise<Object>} API response object { success: true, data: { ... } }
 */
export async function updateComplaintStatus(
  trackingId,
  status,
  changedBy = "admin",
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
    headers: {
      "X-API-Key": API_KEYS.UPDATE_STATUS,
      "Content-Type": "application/json",
    },
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
