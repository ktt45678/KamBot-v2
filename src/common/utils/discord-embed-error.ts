import { generateErrorMessage } from './discord';

export class DiscordEmbedError extends Error {
  title?: string;

  constructor(message: string, title?: string) {
    super(message);
    // Assign the error class name in your custom error (as a shortcut)
    this.name = this.constructor.name
    // Capturing the stack trace keeps the reference to your error class
    Error.captureStackTrace(this, this.constructor);
    // Other properties
    this.title = title;
  }

  toEmbed() {
    return generateErrorMessage(this.message, this.title);
  }
}