// Thin REST client for the ProcessCanvas backend.
// Base URL and auth token are injected at runtime (Amplify env config + Cognito session).

export interface ApiClientOptions {
  baseUrl: string;
  getToken: () => string | null;
}

export class ApiClient {
  constructor(private opts: ApiClientOptions) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = this.opts.getToken();
    const res = await fetch(`${this.opts.baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Request failed: ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  // Exercise
  getExercise = (id: string) => this.request("GET", `/exercises/${id}`);
  savePlacements = (id: string, placements: Record<string, string[]>) =>
    this.request("PUT", `/exercises/${id}/placements`, { placements });
  submit = (id: string, placements: Record<string, string[]>) =>
    this.request("POST", `/exercises/${id}/submit`, { placements });
  verify = (id: string, placements: Record<string, string[]>) =>
    this.request("POST", `/exercises/${id}/verify`, { placements });
  resubmit = (id: string, placements: Record<string, string[]>) =>
    this.request("POST", `/exercises/${id}/resubmit`, { placements });
  saveReflection = (attemptId: string, response: string) =>
    this.request("POST", `/attempts/${attemptId}/reflection`, { response });

  // Authoring
  listTemplates = () => this.request("GET", `/templates`);
  applyConfiguration = (configId: string) =>
    this.request("POST", `/configurations/${configId}/apply`);

  // Results
  getHistory = (studentId: string) => this.request("GET", `/students/${studentId}/history`);
  getClassResults = (exerciseId: string) => this.request("GET", `/exercises/${exerciseId}/results`);

  // Sessions
  startSession = (exerciseId: string) => this.request("POST", `/sessions`, { exerciseId });
  joinSession = (sessionId: string) => this.request("POST", `/sessions/${sessionId}/join`);
}
