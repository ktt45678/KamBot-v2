import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { PORT } from './config';
import { router } from './routing';
import './modules/mongo';
import './modules/redis';
import './client';

const server = express();

server.use(cors());

server.use(express.json());

server.get('/', (req, res) => {
  res.send({ message: 'KamBot v2' });
});

server.use(router)

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});