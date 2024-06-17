export class HttpError {
  /**
 * @type {number}
 * @description Http status of the exception
 */
  status!: number;

  /**
 * @type {number|string}
 * @description Optional error code
 */
  code?: number | string;

  /**
 * @type {string}
 * @description Additional message
 */
  message!: string;
}