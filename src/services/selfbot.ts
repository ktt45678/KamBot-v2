import { CLYDE_BOT_TOKEN } from '../config';
import { http } from '../modules';

export class SelfbotService {
  private apiUrl = 'https://discord.com/api/v9';

  sendChannelMessage = async (channelId: string, content: string) => {
    return http.post(`${this.apiUrl}/channels/${channelId}/messages`, {
      content: content,
      flags: 0,
      nonce: null,
      tts: false
    }, {
      headers: {
        'accept-language': 'en-US',
        'authorization': CLYDE_BOT_TOKEN,
        'sec-ch-ua': '"Not?A_Brand";v="8", "Chromium";v="108"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9013 Chrome/108.0.5359.215 Electron/22.3.2 Safari/537.36',
        'x-debug-options': 'bugReporterEnabled',
        'x-discord-locale': 'en-US',
        'x-discord-timezone': 'Asia/Bangkok'
      }
    });
  }

  async createThread(channelId: string, name: string, content: string) {
    return http.post(`${this.apiUrl}/channels/${channelId}/threads`, {
      applied_tags: [],
      name: name,
      message: {
        content: content
      }
    }, {
      headers: {
        'accept-language': 'en-US',
        'authorization': CLYDE_BOT_TOKEN,
        'sec-ch-ua': '"Not?A_Brand";v="8", "Chromium";v="108"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9013 Chrome/108.0.5359.215 Electron/22.3.2 Safari/537.36',
        'x-debug-options': 'bugReporterEnabled',
        'x-discord-locale': 'en-US',
        'x-discord-timezone': 'Asia/Bangkok'
      },
      params: {
        'use_nested_fields': true
      }
    });
  }
}

export const selfbotService = new SelfbotService();