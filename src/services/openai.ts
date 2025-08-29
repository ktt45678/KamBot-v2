import { AxiosHeaders } from 'axios';
import { ChatCompletionMessageParam, ChatCompletion } from 'openai/resources/chat/completions';
import { ImagesResponse } from 'openai/resources/images';
import { container } from '@sapphire/framework';

import { http } from '../modules/axios';
import { DuckDuckGoChatResponse, ImageSDXLResponse } from '../common/interfaces/openai';
import { NAGA_AI_API_KEY, KALIE_API_URL } from '../config';
import { CachePrefix } from '../common/enums';

export class OpenAIService {
  private openAIUrl = 'https://api.naga.ac/v1';
  private duckduckgoAIUrl = 'https://duckduckgo.com/duckchat/v1'
  private kalieAPIUrl = KALIE_API_URL;
  private headers: AxiosHeaders;
  private imageGenerationLimits: { [key: string]: number } = {
    'midjourney': 4,
    'sdxl': 5,
    'dall-e-3': 4,
    'kandinsky-3': 10,
    'kandinsky-2.2': 10,
    'kandinsky-2': 10,
    'playground-v2.5': 5
  };

  constructor() {
    this.headers = new AxiosHeaders();
    this.headers.setAuthorization(`Bearer ${NAGA_AI_API_KEY}`);
  }

  async createChatCompletion(messages: ChatCompletionMessageParam[], model: string = 'gpt-3.5-turbo-1106') {
    const headers = new AxiosHeaders(this.headers);
    headers.set('x-retry-status', '400, 408, 429, 500, 502, 503, 504');

    const response = await http.post<ChatCompletion>(`${this.openAIUrl}/chat/completions`, { model, messages },
      { headers: headers });
    return response.data;
  }

  async createChatCompletionDDG(messages: ChatCompletionMessageParam[], vqd: string, model: string = 'gpt-4o-mini') {
    const headers = new AxiosHeaders();
    headers.set('accept', 'text/event-stream');
    headers.set('accept-encoding', 'gzip, deflate, br');
    headers.set('accept-language', 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7');
    headers.set('origin', 'https://duckduckgo.com');
    headers.set('referer', 'https://duckduckgo.com/');
    headers.set('sec-ch-ua', '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"');
    headers.set('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
    headers.set('x-retry-status', '408, 429, 500, 502, 503, 504');
    headers.set('x-vqd-hash-1', vqd);

    const response = await http.post(`${this.duckduckgoAIUrl}/chat`, { model, messages },
      { headers: headers, responseType: 'stream' });

    return new Promise<DuckDuckGoChatResponse | null>((resolve) => {
      let completeMessage: DuckDuckGoChatResponse | null = null;
      response.data.on('data', (data: Buffer) => {
        const dataString = data.toString('utf-8');
        console.log(dataString)
        const dataStringSplit = dataString.split('\n');
        for (let i = 0; i < dataStringSplit.length; i++) {
          const dataStringPart = dataStringSplit[i].replace('data: ', '');
          if (dataStringPart === '' || dataStringPart === '\n' || dataStringPart === '[DONE]')
            continue;
          const parsedData = <DuckDuckGoChatResponse>JSON.parse(dataStringPart);
          if (completeMessage === null)
            completeMessage = parsedData;
          else
            completeMessage = {
              ...completeMessage,
              ...parsedData,
              message: completeMessage.message + (parsedData.message || '')
            };
        }
      });
      response.data.on('end', () => {
        resolve(completeMessage);
      });
    });
  }

  async getDuckDuckGoVQD() {
    const cachedVQD = await container.memoryCache.get<string>(CachePrefix.DuckDuckGoVQD);
    if (cachedVQD) return cachedVQD;

    const headers = new AxiosHeaders();
    headers.set('accept-encoding', 'gzip, deflate, br');
    headers.set('accept-language', 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7');
    headers.set('connection', 'keep-alive');
    headers.set('sec-ch-ua', '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"');
    headers.set('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
    headers.set('origin', 'https://duckduckgo.com');
    headers.set('referer', 'https://duckduckgo.com/');
    headers.set('x-vqd-accept', '1');
    headers.set('x-retry-status', '408, 500, 502, 503, 504');

    const response = await http.get('https://duckduckgo.com/duckchat/v1/status', { headers: headers, responseType: 'text' });

    const vqdValue = response.headers['x-vqd-hash-1'];
    await container.memoryCache.set(CachePrefix.DuckDuckGoVQD, vqdValue, 1_800_000);
    return vqdValue;
  }

  async createImages(prompt: string, model: string = 'sdxl', n: number = 4, size: string = '1024x1024') {
    const headers = new AxiosHeaders(this.headers);
    headers.set('x-retry-status', '400, 408, 429, 500, 502, 503, 504');

    const imageLimit = this.imageGenerationLimits[model] || 1;
    if (n > imageLimit)
      n = imageLimit;
    const response = await http.post<ImagesResponse>(`${this.openAIUrl}/images/generations`,
      { prompt, n, size, response_format: 'url', model }, { headers: headers });
    return response.data;
  }

  async createImagesSDXL(prompt: string, style?: string) {
    const response = await http.post<ImageSDXLResponse>(`${this.kalieAPIUrl}/clipdrop/stable-diffusion`,
      { prompt, style, responseFormat: 'base64' });
    return response.data;
  }
}

export const openAIService = new OpenAIService();
