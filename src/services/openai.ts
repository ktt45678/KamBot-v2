import { AxiosHeaders } from 'axios';
import { ImagesResponse } from 'openai';

import { http } from '../modules/axios';
import { ImageSDXLResponse } from '../common/interfaces/openai';
import { CHIMERA_API_KEY, KALIE_API_URL } from '../config';

export class OpenAIService {
  private openAIUrl = 'https://chimeragpt.adventblocks.cc/api/v1';
  private kalieAPIUrl = KALIE_API_URL;
  private headers: AxiosHeaders;

  constructor() {
    this.headers = new AxiosHeaders();
    this.headers.setAuthorization(`Bearer ${CHIMERA_API_KEY}`);
  }

  async createImages(prompt: string, n: number = 5, size: string = '1024x1024') {
    const response = await http.post<ImagesResponse>(`${this.openAIUrl}/images/generations`,
      { prompt, n, size, response_format: 'url', model: 'kandinsky' }, { headers: this.headers });
    return response.data;
  }

  async createImagesSDXL(prompt: string, style?: string) {
    const response = await http.post<ImageSDXLResponse>(`${this.kalieAPIUrl}/clipdrop/stable-diffusion`,
      { prompt, style, responseFormat: 'base64' });
    return response.data;
  }
}

export const openAIService = new OpenAIService();