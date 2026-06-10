export const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export interface ApiProject {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ApiMediaItem {
  id: string;
  project_id: string;
  name: string;
  type: 'video' | 'audio';
  url: string;
  duration: number;
  width: number | null;
  height: number | null;
}

export interface ApiExportJob {
  job_id: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  progress: number;
  output_url: string | null;
  error: string | null;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export const api = {
  projects: {
    create: (name: string, id?: string) =>
      request<ApiProject>('/projects', {
        method: 'POST',
        body: JSON.stringify({ name, id }),
      }),
    get: (id: string) => request<ApiProject>(`/projects/${id}`),
    update: (id: string, name: string) =>
      request<ApiProject>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
  },

  media: {
    upload: (projectId: string, file: File, onProgress?: (pct: number) => void) => {
      return new Promise<ApiMediaItem>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const form = new FormData();
        form.append('file', file);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
          else reject(new Error(`Upload failed: ${xhr.statusText}`));
        };
        xhr.onerror = () => reject(new Error('Upload network error'));
        xhr.open('POST', `${BASE}/projects/${projectId}/media`);
        xhr.send(form);
      });
    },
    list: (projectId: string) => request<ApiMediaItem[]>(`/projects/${projectId}/media`),
    transcribe: (projectId: string, mediaId: string) =>
      request<{ segments: TranscriptSegment[] }>(
        `/projects/${projectId}/media/${mediaId}/transcribe`,
        { method: 'POST' },
      ),
    denoise: (projectId: string, mediaId: string, force = false) =>
      request<{ url: string }>(`/projects/${projectId}/media/${mediaId}/denoise?force=${force}`, { method: 'POST' }),
    isolate: (projectId: string, mediaId: string) =>
      request<{ url: string; method: string }>(`/projects/${projectId}/media/${mediaId}/isolate`, { method: 'POST' }),
    waveform: (projectId: string, mediaId: string, points = 400) =>
      request<{ peaks: number[]; duration: number }>(
        `/projects/${projectId}/media/${mediaId}/waveform?points=${points}`,
      ),
  },

  exports: {
    create: (projectId: string, body: object) =>
      request<ApiExportJob>(`/projects/${projectId}/exports`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    get: (jobId: string) => request<ApiExportJob>(`/exports/${jobId}`),
  },
};
