import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';

export type AiChatMessageContent = string | ChatCompletionContentPart[];

// export interface AiChatMessageTextContent {
//   type: 'text';
//   text: string;
// }

// export interface AiChatMessageImageContent {
//   type: 'image_url';
//   image_url: AiChatMessageImageUrlContent;
// }

// export interface AiChatMessageImageUrlContent {
//   url: string;
// }