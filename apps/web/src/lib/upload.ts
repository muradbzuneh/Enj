import { API_BASE_URL, ensureApiBaseUrl } from "./api/client";

export async function uploadFile(file: File): Promise<{ url: string; type: string }> {
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("File too large. Maximum size is 20MB.");
  }

  await ensureApiBaseUrl();

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || `Upload failed (${response.status})`);
  }

  return { url: result.data.url, type: result.data.type };
}
