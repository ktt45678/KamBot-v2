import { NextFunction, Request, Response } from 'express';

import { HttpException } from '../common/exceptions/http.exception';

// Handle any errors that come up
export const errorHandler = (e: HttpException, req: Request, res: Response, next: NextFunction): void => {
  if (e.status) {
    if (e.code) {
      res.status(e.status).send({ message: e.message, code: e.code });
    } else {
      res.status(e.status).send({ message: e.message });
    }
  }
  else {
    console.error(e);
    res.status(500).send({ message: 'Lỗi xảy ra từ phía máy chủ' });
  }
}

// Handle case where user requests nonexistent endpoint
export const nullRoute = (req: Request, res: Response): void => {
  res.status(404).send({ message: 'Not found' });
}