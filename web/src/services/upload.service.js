function normalizeApiBase(rawBase) {
  if (!rawBase) return "/api";
  return rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;
}

const API_BASE = normalizeApiBase(import.meta.env.VITE_API_URL);

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/uploads/image`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Upload failed");
  }

  return response.json();
}
