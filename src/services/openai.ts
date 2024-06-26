import { AxiosHeaders } from 'axios';
import { ChatCompletionMessageParam, ChatCompletion } from 'openai/resources/chat/completions';
import { ImagesResponse } from 'openai/resources/images';

import { http } from '../modules/axios';
import { ImageSDXLResponse } from '../common/interfaces/openai';
import { NAGA_AI_API_KEY, KALIE_API_URL } from '../config';

export class OpenAIService {
  private openAIUrl = 'https://api.naga.ac/v1';
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

  async createImages(prompt: string, model: string = 'sdxl', n: number = 4, size: string = '1024x1024') {
    const headers = new AxiosHeaders(this.headers);
    headers.set('x-retry-status', '400, 408, 429, 500, 502, 503, 504');

    const imageLimit = this.imageGenerationLimits[model] || 1;
    if (n > imageLimit)
      n = imageLimit;
    console.log({ prompt, n, size, response_format: 'url', model });
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