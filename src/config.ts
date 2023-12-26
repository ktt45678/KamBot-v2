export const PORT = process.env.PORT || 3000;
export const OWNER_ID = process.env.OWNER_ID;
export const BOT_TOKEN = process.env.BOT_TOKEN;
export const DATABASE_URL = process.env.DATABASE_URL || '';
export const DATABASE_CACHE_URL = process.env.DATABASE_CACHE_URL || '';
export const REDIS_URL = process.env.REDIS_URL || '';
export const DEFAULT_PREFIX = process.env.DEFAULT_PREFIX || '+';
export const NAGA_AI_API_KEY = process.env.NAGA_AI_API_KEY;
export const SAUCENAO_API_KEY = process.env.SAUCENAO_API_KEY;
export const KALIE_API_URL = process.env.KALIE_API_URL;
export const LAVALINK_NAME = process.env.LAVALINK_NAME || '';
export const LAVALINK_URL = process.env.LAVALINK_URL || '';
export const LAVALINK_AUTH = process.env.LAVALINK_AUTH || '';
export const WEBHOOK_LOG_URL = process.env.WEBHOOK_LOG_URL;
export const GODIT_RATE = Number(process.env.GODIT_RATE) || 1;
export const GODIT_BLACKLIST = process.env.GODIT_BLACKLIST ? process.env.GODIT_BLACKLIST.split(',') : [];
export const GODIT_BLACKLIST_MESSAGES = process.env.GODIT_BLACKLIST_MESSAGES ? process.env.GODIT_BLACKLIST_MESSAGES.split(',') : [];
export const IMAGEKIT_URL = process.env.IMAGEKIT_URL || '';
export const CLYDE_BOT_TOKEN = process.env.CLYDE_BOT_TOKEN;
export const CLYDE_BOT_GUILD = process.env.CLYDE_BOT_GUILD || '';
export const CLYDE_BOT_CHANNEL = process.env.CLYDE_BOT_CHANNEL || '';
export const CLYDE_BOT_REDACTED_WORDS = process.env.CLYDE_BOT_REDACTED_WORDS ? process.env.CLYDE_BOT_REDACTED_WORDS.replaceAll(',', '|') : null;
export const MYFGO_CRYPTO_SECRET_KEY = process.env.MYFGO_CRYPTO_SECRET_KEY;
export const AI_CHAT_SYSTEM_MESSAGE = process.env.AI_CHAT_SYSTEM_MESSAGE;