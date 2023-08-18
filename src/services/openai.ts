import { AxiosHeaders } from 'axios';
import { ImagesResponse } from 'openai';

import { http } from '../modules/axios';
import { ImageSDXLResponse } from '../common/interfaces/openai';
import { CHIMERA_API_KEY, KALIE_API_URL } from '../config';

export class OpenAIService {
  private openAIUrl = 'https://chimeragpt.adventblocks.cc/api/v1';
  private kalieAPIUrl = KALIE_API_URL;
  private headers: AxiosHeaders;
  private imageGenerationLimits: { [key: string]: number } = {
    'midjourney': 1,
    'sdxl': 5,
    'stable-diffusion-2.1': 5,
    'stable-diffusion-1.5': 5,
    'kandinsky-2.2': 5,
    'deepfloyd-if': 4,
    'material-diffusion': 5
  };

  constructor() {
    this.headers = new AxiosHeaders();
    this.headers.setAuthorization(`Bearer ${CHIMERA_API_KEY}`);
  }

  async createImages(prompt: string, model: string = 'sdxl', n: number = 5, size: string = '1024x1024') {
    const headers = new AxiosHeaders(this.headers);
    headers.set('x-retry-status', '400, 408, 429, 500, 502, 503, 504');

    const imageLimit = this.imageGenerationLimits[model] || 1;
    if (n > imageLimit)
      n = imageLimit;

    const response = await http.post<ImagesResponse>(`${this.openAIUrl}/images/generations`,
      { prompt, n, size, response_format: 'url', model: model }, { headers: headers });
    return response.data;
  }

  async createImagesSDXL(prompt: string, style?: string) {
    const response = await http.post<ImageSDXLResponse>(`${this.kalieAPIUrl}/clipdrop/stable-diffusion`,
      { prompt, style, responseFormat: 'base64' });
    return response.data;
  }
}

export const openAIService = new OpenAIService();