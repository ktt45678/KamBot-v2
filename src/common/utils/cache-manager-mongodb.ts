// Original: https://github.com/Tirke/node-cache-manager-stores/blob/main/packages/node-cache-manager-mongodb/src/lib/node-cache-manager-mongodb.ts
import type { Store, Config, Cache } from 'cache-manager';
import { Db, MongoClient, MongoClientOptions, Binary } from 'mongodb';

export type MongoCache = Cache<MongoDbStore>
export type CacheDoc = {
  key: string;
  value: unknown;
  expireAt?: Date;
}

interface MongoDbStore extends Store {
  readonly isCacheable: (value: unknown) => boolean;

  get client(): MongoClient;
}

type Args = {
  url?: string;
  mongoConfig?: MongoClientOptions;
  modelName?: string;
  max?: number;
} & Config

class MongoDb implements MongoDbStore {
  public readonly client: MongoClient;
  readonly internalTtl: number | undefined;
  readonly isCacheable: (value: unknown) => boolean;
  readonly db: Db;
  private initIndexes = true;
  private modelName: string;
  private max: number;

  constructor(args: Args) {
    this.internalTtl = args.ttl;
    this.isCacheable = args.isCacheable || ((value: unknown) => value !== undefined && value !== null);
    if (args.url) {
      this.client = new MongoClient(args.url, args.mongoConfig);
    } else if (!args.url && args.mongoConfig) {
      this.client = new MongoClient('mongodb://localhost:27017', args.mongoConfig);
    } else {
      throw new Error('MongoDB connection URL and mongoConfig are required');
    }
    this.db = this.client.db();
    this.modelName = args.modelName || 'cache';
    this.max = args.max || 0;
  }

  async getColl() {
    const coll = this.db.collection<CacheDoc>(this.modelName);

    if (this.initIndexes) {
      await coll.createIndex({ key: 1 }, { unique: true });
      await coll.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 });
      this.initIndexes = false;
    }

    return coll;
  }

  async set<T>(key: string, value: T, ttl?: number) {
    if (!this.isCacheable(value)) {
      throw new Error(`${value} is not cacheable`);
    }

    const actualTtl = ttl ?? this.internalTtl;
    const data: CacheDoc = { key, value };

    if (actualTtl) {
      data.expireAt = new Date(Date.now() + actualTtl);
    }

    const coll = await this.getColl();

    if (this.max > 0) {
      const docCount = await coll.estimatedDocumentCount();
      if (docCount >= this.max) {
        return;
      }
    }

    await coll.updateOne({ key }, { $set: data }, { upsert: true });
  }

  async get<T>(key: string): Promise<T | undefined> {
    const coll = await this.getColl();
    const doc = await coll.findOne({ key });
    if (doc?.value instanceof Binary) {
      return Buffer.from(doc.value.buffer) as T;
    }
    return doc?.value as T;
  }

  async mset(args: [string, unknown][], ttl?: number) {
    const actualTtl = ttl ?? this.internalTtl;
    const coll = await this.getColl();

    if (this.max > 0) {
      const docCount = await coll.estimatedDocumentCount();
      if (docCount >= this.max) {
        return;
      }
    }

    if (actualTtl) {
      const docs = args.flatMap(([key, value]) => {
        if (!this.isCacheable(value)) {
          throw new Error(`${value} is not cacheable`);
        }
        return [{ key, value, expireAt: new Date(Date.now() + actualTtl) }];
      });

      await coll.insertMany(docs);
    } else {
      const docs = args.flatMap(([key, value]) => {
        if (!this.isCacheable(value)) {
          throw new Error(`${value} is not cacheable`);
        }
        return [{ key, value }];
      })

      await coll.insertMany(docs);
    }
  }

  async mget(...args: string[]) {
    const coll = await this.getColl();
    const cursor = coll.find({ key: { $in: args } });
    return (await cursor.toArray()).map((doc) => {
      if (doc.value instanceof Binary) {
        return Buffer.from(doc.value.buffer);
      }
      return doc.value;
    });
  }

  async mdel(...args: string[]) {
    const coll = await this.getColl();
    await coll.deleteMany({ key: { $in: args } });
  }

  async del(key: string) {
    const coll = await this.getColl();
    await coll.deleteOne({ key });
  }

  async reset() {
    const coll = await this.getColl();
    await coll.drop();
    this.initIndexes = true;
  }

  async keys(pattern = '.*') {
    const coll = await this.getColl();
    const cursor = coll.find({ key: { $regex: pattern } });
    return (await cursor.toArray()).map((doc) => doc.key);
  }

  async ttl(key: string) {
    const coll = await this.getColl();
    const doc = await coll.findOne({ key });
    if (doc && doc.expireAt) {
      return Math.round((doc.expireAt.getTime() - Date.now()) / 1000);
    }
    return -1;
  }
}

export const mongoDbStore = (args?: Args) => {
  if (!args) {
    throw new Error('please provide a URL and config to init the mongo client');
  }

  return new MongoDb(args);
}