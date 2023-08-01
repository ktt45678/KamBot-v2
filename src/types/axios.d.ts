import 'axios';

declare module 'axios' {
  interface AxiosError {
    retryOptions?: AxiosRetryOptions;
  }

  interface AxiosRetryOptions {
    retry?: number;
  }
}