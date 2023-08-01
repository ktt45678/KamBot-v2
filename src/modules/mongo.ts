import { connect, connection } from 'mongoose';

import { DATABASE_URL } from '../config';

export async function bootstraptMongoConnection() {
  connection.on('error', console.error.bind(console, 'Database connection error:'));
  await connect(DATABASE_URL, { family: 4 });
};

bootstraptMongoConnection();