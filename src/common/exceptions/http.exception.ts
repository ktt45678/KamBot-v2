import { HttpError } from '../entities/http-error.entity';

export class HttpException extends Error {
  status: number;
  code?: number | string;
  message: string;

  /**
  * Creates a new error exception
  * @param {HttpError} Error data
  */
  constructor(error: HttpError) {
    super(error.message);
    this.status = error.status;
    this.message = error.message;
    this.code = error.code;
  }
}