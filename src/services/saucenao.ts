import { http } from '../modules';
import { SAUCENAO_API_KEY } from '../config';
import { SaucenaoSearchResponse } from '../common/interfaces/utils';

export class SaucenaoService {
  private saucenaoUrl: string = 'https://saucenao.com';
  private whitelist: string = '1486194217824';
  private minSimilarity: number = 70;

  async findSauce(url: string) {
    const params = {
      output_type: 2,
      numres: 10,
      api_key: SAUCENAO_API_KEY,
      dbmask: this.whitelist,
      url: url
    };
    const result = await http.get<SaucenaoSearchResponse>(`${this.saucenaoUrl}/search.php`, { params, timeout: 30_000 });
    const filteredRes = result.data;
    filteredRes.results = filteredRes.results.filter(r => +r.header.similarity >= this.minSimilarity);
    return filteredRes;
  }
}

export const saucenaoService = new SaucenaoService();