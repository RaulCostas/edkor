import axios from "axios";
import { API_BASE_URL } from "../config";

export { API_BASE_URL };

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const sucursalId = localStorage.getItem("selectedSucursalId");
    if (sucursalId) {
      config.headers["x-sucursal-id"] = sucursalId;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);
export default api;
