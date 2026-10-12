// app/lib/api-client.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/useAuthStore";

const baseUrl = process.env.NEXT_PUBLIC_GATEWAY_URL;

if (!baseUrl) {
  console.error("API Gateway not configured");
}

export const apiClient = axios.create({
  baseURL: baseUrl,
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: { resolve: (value?: any) => void; reject: (reason?: any) => void }[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

function decodeJwtPayload(token: string): { orgId?: string; userId?: string } | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    // atob works in the browser; this client runs client-side only.
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return json;
  } catch {
    return null;
  }
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken, user } = useAuthStore.getState();

  if (accessToken) {
    const claims = decodeJwtPayload(accessToken);
    const tokenOrg = claims?.orgId;
    const storeOrg = user?.activeOrgId;

    if (tokenOrg && storeOrg && tokenOrg !== storeOrg) {
      console.error(
        `[apiClient] org mismatch — token.orgId=${tokenOrg} store.activeOrgId=${storeOrg}. ` +
        `Refusing to send a request that would leak data across orgs.`
      );
      return Promise.reject(
        new Error("Org mismatch between access token and store. Refresh or switch org.")
      );
    }

    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalReq = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (
      error.response?.status === 401 &&
      !originalReq._retry &&
      !originalReq.url?.includes("/api/auth/refresh") &&
      !originalReq.url?.includes("/api/auth/login") &&
      !originalReq.url?.includes("/api/auth/switch-org")
    ) {
      originalReq._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalReq.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalReq);
        }).catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `/api/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { token } = data;
        const newAccessToken = token?.accessToken;

        useAuthStore.getState().setAccessToken(newAccessToken);
        processQueue(null, newAccessToken);

        originalReq.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalReq);
      } catch (refreshError: any) {
        console.log(refreshError);
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);