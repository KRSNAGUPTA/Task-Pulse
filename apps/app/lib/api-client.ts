import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";

const baseUrl = process.env.API_GATEWAY;
if (!baseUrl) {
    console.error("API Gateway not configured")
}

const apiClient = axios.create({
    baseURL: baseUrl,
    withCredentials: true
})

apiClient.interceptors.request.use((config) => {
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config;
})

apiClient.interceptors.response.use((res) => res, async (error) => {
    const originalReq = error.config;
    if (error.response.status === 401 && !originalReq._retry && !originalReq.url?.includes("/api/auth/refresh") && !originalReq.url?.includes("/api/auth/login")) {
        originalReq._retry = true;


        try {
            const { data } = await axios.post(`baseUrl`, {}, {
                withCredentials: true
            })

            const { token } = data;

            useAuthStore.getState().setAccessToken(token?.accessToken);
            originalReq.headers.Authorization = `Bearer ${token?.accessToken}`;
            return apiClient(originalReq);

        } catch (error: any) {
            useAuthStore.getState().logout();
            if(typeof window != 'undefined'){
                window.location.href = "/login"
            }
            return Promise.reject(error);
        }
    }
})