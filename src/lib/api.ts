const API_BASE = import.meta.env.VITE_API_BASE ?? "/api"

export interface CreateJobResponse {
  id: string
  status: string
}

export async function createJobWithFile(
  file: File,
  showId: string,
  onProgress?: (pct: number) => void,
): Promise<CreateJobResponse> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("show_id", showId)

  const xhr = new XMLHttpRequest()
  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`))
      }
    })
    xhr.addEventListener("error", () => reject(new Error("Network error")))
    xhr.open("POST", `${API_BASE}/jobs`)
    xhr.send(formData)
  })
}

export async function createJobWithDriveUrl(
  driveUrl: string,
  showId: string,
): Promise<CreateJobResponse> {
  const res = await fetch(`${API_BASE}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ drive_url: driveUrl, show_id: showId }),
  })
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`)
  }
  return res.json()
}
