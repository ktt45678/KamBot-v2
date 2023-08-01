import { container } from '@sapphire/framework';

export class MusicService {
  async loadTracks(query: string) {
    const node = container.playerManager.getNode()!;
    return node.rest.resolve(query);
    // const url = `http://${node.host}:${node.port}/loadtracks`;
    // const headers = new AxiosHeaders();
    // headers.setAuthorization(node.password);
    // const response = await http.get<LoadTracksResult>(url, { params: { identifier: query }, headers: headers, data: { retry: 5 } });
    // return response.data;
  }
}

export const musicService = new MusicService();