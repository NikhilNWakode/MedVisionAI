import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;

export async function login(email: string, password: string) {
  const res = await api.post("/auth/token", { email, password });
  const { access_token } = res.data;
  localStorage.setItem("token", access_token);
  return res.data;
}

export async function register(email: string, name: string, password: string) {
  return api.post("/auth/register", { email, name, password });
}

export async function verifyToken() {
  return api.get("/auth/verify");
}

export async function uploadImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/images/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export async function getImages() {
  return api.get("/images");
}

export async function getImage(id: string) {
  return api.get(`/images/${id}`);
}

export async function generateReport(imageId: string, clinicalNotes?: string) {
  return api.post("/reports/generate", {
    image_id: imageId,
    clinical_notes: clinicalNotes,
  });
}

export async function getReport(id: string) {
  return api.get(`/reports/${id}`);
}

export async function getReports() {
  return api.get("/reports");
}

// Cases
export async function createCase(data: {
  patient_id: string;
  patient_name?: string;
  age?: number;
  sex?: string;
  clinical_history?: string;
  priority?: string;
}) {
  return api.post("/cases", data);
}

export async function getCases(statusFilter?: string) {
  const params = statusFilter ? { status_filter: statusFilter } : {};
  return api.get("/cases", { params });
}

export async function getCase(id: string) {
  return api.get(`/cases/${id}`);
}

export async function updateCase(id: string, data: Record<string, any>) {
  return api.patch(`/cases/${id}`, data);
}

export async function attachImageToCase(caseId: string, imageId: string) {
  return api.post(`/cases/${caseId}/images/${imageId}`);
}

// Audit
export async function getAuditLogs(resourceType?: string) {
  const params = resourceType ? { resource_type: resourceType } : {};
  return api.get("/audit", { params });
}
