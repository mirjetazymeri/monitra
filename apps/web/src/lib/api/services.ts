import { apiRequest } from "./client";
import type { CheckResult, Endpoint, EndpointInput, User } from "./types";

export const authApi = {
  login: (email: string, password: string, remember: boolean) =>
    apiRequest<{ user: User }>("/api/auth/login", { method: "POST", body: { email, password, remember } }),
  logout: () => apiRequest<void>("/api/auth/logout", { method: "POST" }),
};

export const endpointsApi = {
  create: (input: EndpointInput) => apiRequest<Endpoint>("/api/endpoints", { method: "POST", body: input }),
  update: (id: number, input: EndpointInput) => apiRequest<Endpoint>(`/api/endpoints/${id}`, { method: "PUT", body: input }),
  setEnabled: (id: number, isEnabled: boolean) =>
    apiRequest<Endpoint>(`/api/endpoints/${id}`, { method: "PATCH", body: { is_enabled: isEnabled } }),
  remove: (id: number) => apiRequest<void>(`/api/endpoints/${id}`, { method: "DELETE" }),
  check: (id: number) => apiRequest<CheckResult>(`/api/endpoints/${id}/check`, { method: "POST" }),
};

export const settingsApi = {
  removeDemoData: () => apiRequest<{ deleted_endpoints: number }>("/api/settings/demo-data", { method: "DELETE" }),
};
