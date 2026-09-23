import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";

const baseUrl = process.env.NEXT_PUBLIC_GATEWAY_URL;

if (!process.env.NEXT_PUBLIC_GATEWAY_URL) {
  console.error("API Gateway not configured");
}

export const apiClient = axios.create({
  baseURL: baseUrl,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalReq = error.config;

    if (
      error.response?.status === 401 &&
      !originalReq._retry &&
      !originalReq.url?.includes("/api/auth/refresh") &&
      !originalReq.url?.includes("/api/auth/login")
    ) {
      originalReq._retry = true;

      try { 
        const { data } = await axios.post(
          `${baseUrl}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { token } = data;
        const newAccessToken = token?.accessToken;

        useAuthStore.getState().setAccessToken(newAccessToken);
        originalReq.headers.Authorization = `Bearer ${newAccessToken}`;

        return apiClient(originalReq);
      } catch (refreshError: any) {
        useAuthStore.getState().logout();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);