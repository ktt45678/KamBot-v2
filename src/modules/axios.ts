import axios, { AxiosError } from 'axios';
import { container } from '@sapphire/framework';

const http = axios.create();

http.interceptors.response.use(undefined, async (err: AxiosError) => {
  const { config, message } = err;

  if (!config || config.headers['x-retry'] <= 0) {
    return Promise.reject(err);
  }

  if (!config.headers['x-retry']) {
    config.headers['x-retry'] = 5;
  }

  const retryStatusCodes: number[] = config.headers['x-retry-status'] ?
    config.headers['x-retry-status'].split(',').map((status: string) => Number(status)) :
    [408, 429, 500, 502, 503, 504];

  // retry while Network timeout or Network Error
  if (err.response && err.response.status && !retryStatusCodes.includes(err.response.status)) {
    return Promise.reject(err);
  }
  config.headers['x-retry'] -= 1;

  const delayRetryRequest = new Promise<void>((resolve) => {
    setTimeout(() => {
      container.logger.error('HTTP request erorr: ' + message);
      container.logger.info('Retry the request', config.url);
      resolve();
    }, config.headers['x-retry-delay'] || 3000);
  });
  return delayRetryRequest.then(() => http.request(config));
});

export { http };