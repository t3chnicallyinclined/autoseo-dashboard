const API_BASE = import.meta.env.VITE_API_URL ?? ""

export interface CreateJobResponse {
  job_id: string
  status: "pending"
}

export async function uploadJob(
  file: File,
  showSlug?: string,
  onProgress?: (pct: number) => void,
): Promise<CreateJobResponse> {
  const formData = new FormData()
  formData.append("file", file)
  if (showSlug) formData.append("show_slug", showSlug)

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
    xhr.addEventListener("error", () => reject(new Error("Upload failed")))
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")))
    xhr.open("POST", `${API_BASE}/api/jobs/upload`)
    xhr.send(formData)
  })
}

export async function ingestDriveUrl(
  driveUrl: string,
  showSlug?: string,
): Promise<CreateJobResponse> {
  const res = await fetch(`${API_BASE}/api/jobs/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ drive_url: driveUrl, show_slug: showSlug }),
  })
  if (!res.ok) {
    throw new Error(`Ingest failed: ${res.status} ${res.statusText}`)
  }
  return res.json()
}
