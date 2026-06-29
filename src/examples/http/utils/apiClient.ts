import axios, {
  type InternalAxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
} from 'axios';

// Augment axios types to carry timing metadata used by the interceptors.
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: { startTime: Date; endTime?: Date };
  }
  interface AxiosResponse {
    duration?: number;
  }
  interface AxiosError {
    duration?: number;
  }
}

const apiClient = axios.create();

apiClient.interceptors.request.use(
  function (config: InternalAxiosRequestConfig) {
    config.metadata = { startTime: new Date() };
    return config;
  },
  function (error: unknown) {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  function (response: AxiosResponse) {
    if (response.config.metadata) {
      response.config.metadata.endTime = new Date();
      response.duration =
        response.config.metadata.endTime.getTime() -
        response.config.metadata.startTime.getTime();
    }
    return response;
  },
  function (error: AxiosError) {
    if (error.config?.metadata) {
      error.config.metadata.endTime = new Date();
      error.duration =
        error.config.metadata.endTime.getTime() -
        error.config.metadata.startTime.getTime();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
