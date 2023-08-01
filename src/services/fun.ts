import { container } from '@sapphire/framework';

export class FunService {
  private goditShield = 'goditShield';
  private goditStun = 'goditStun';
  private ignoreGoditShield = 'ignoreGoditShield';
  private ignoreGoditShieldCD = 'ignoreGoditShieldCooldown';
  private stunCooldown = 'stunCooldown';
  private removeDebuffsCooldown = 'removeDebuffsCooldown';
  private debuffResist = 'debuffResist';
  private debuffResistCounter = 'debuffResistCounter';
  private debuffResistCooldown = 'debuffResistCooldown';
  private debuffImmune = 'debuffImmune';
  private randomEffectCooldown = 'randomEffectCooldown';
  private alter = 'alter';
  private alterCooldown = 'alterCooldown';
  private pretend = 'pretend';
  private pretendCooldown = 'pretendCooldown';
  private debuffs = [this.goditStun];

  createGoditShield(id: string, time: number = 1800) {
    const key = `${this.goditShield}:${id}`;
    return container.redisCache.set(key, true, time);
  }

  findGoditShield(id: string) {
    const key = `${this.goditShield}:${id}`;
    return container.redisCache.get<boolean>(key);
  }

  ttlGoditShield(id: string) {
    const key = `${this.goditShield}:${id}`;
    return container.redisCache.store.ttl(key);
  }

  delGoditShield(id: string) {
    const key = `${this.goditShield}:${id}`;
    return container.redisCache.del(key);
  }

  createGoditStun(id: string, time: number = 1800) {
    const key = `${this.goditStun}:${id}`;
    return container.redisCache.set(key, true, time);
  }

  findGoditStun(id: string) {
    const key = `${this.goditStun}:${id}`;
    return container.redisCache.get<boolean>(key);
  }

  ttlGoditStun(id: string) {
    const key = `${this.goditStun}:${id}`;
    return container.redisCache.store.ttl(key);
  }

  createIgnoreGoditShield(id: string, time: number = 1800) {
    const key = `${this.ignoreGoditShield}:${id}`;
    return container.redisCache.set(key, true, time);
  }

  findIgnoreGoditShield(id: string) {
    const key = `${this.ignoreGoditShield}:${id}`;
    return container.redisCache.get<boolean>(key);
  }

  delIgnoreGoditShield(id: string) {
    const key = `${this.ignoreGoditShield}:${id}`;
    return container.redisCache.del(key);
  }

  createIgnoreGoditShieldCD(id: string, time: number = 7200) {
    const key = `${this.ignoreGoditShieldCD}:${id}`;
    return container.redisCache.set(key, true, time);
  }

  ttlIgnoreGoditShieldCD(id: string) {
    const key = `${this.ignoreGoditShieldCD}:${id}`;
    return container.redisCache.store.ttl(key);
  }

  createStunCooldown(id: string, time: number = 7200) {
    const key = `${this.stunCooldown}:${id}`;
    return container.redisCache.set(key, true, time);
  }

  ttlStunCooldown(id: string) {
    const key = `${this.stunCooldown}:${id}`;
    return container.redisCache.store.ttl(key);
  }

  createRemoveDebuffsCooldown(id: string, time: number = 7200) {
    const key = `${this.removeDebuffsCooldown}:${id}`;
    return container.redisCache.set(key, true, time);
  }

  ttlRemoveDebuffsCooldown(id: string) {
    const key = `${this.removeDebuffsCooldown}:${id}`;
    return container.redisCache.store.ttl(key);
  }

  removeDebuffs(id: string) {
    return Promise.all(this.debuffs.map(debuff => {
      const key = `${debuff}:${id}`;
      return container.redisCache.del(key);
    }));
  }

  createDebuffResistCounter(id: string, count: number, time: number = 18000) {
    const key = `${this.debuffResistCounter}:${id}`;
    return container.redisCache.set(key, count, time);
  }

  findDebuffResistCounter(id: string) {
    const key = `${this.debuffResistCounter}:${id}`;
    return container.redisCache.get<number>(key);
  }

  createDebuffResist(id: string, index: number, time: number = 18000) {
    const key = `${this.debuffResist}:${index}:${id}`;
    return container.redisCache.set(key, true, time);
  }

  ttlDebuffResist(id: string, index: number) {
    const key = `${this.debuffResist}:${index}:${id}`;
    return container.redisCache.store.ttl(key);
  }

  createDebuffResistCooldown(id: string, time: number = 7200) {
    const key = `${this.debuffResistCooldown}:${id}`;
    return container.redisCache.set(key, true, time);
  }

  ttlDebuffResistCooldown(id: string) {
    const key = `${this.debuffResistCooldown}:${id}`;
    return container.redisCache.store.ttl(key);
  }

  createDebuffImmune(id: string, time: number = 1800) {
    const key = `${this.debuffImmune}:${id}`;
    return container.redisCache.set(key, true, time);
  }

  findDebuffImmune(id: string) {
    const key = `${this.debuffImmune}:${id}`;
    return container.redisCache.get<boolean>(key);
  }

  ttlDebuffImmune(id: string) {
    const key = `${this.debuffImmune}:${id}`;
    return container.redisCache.store.ttl(key);
  }

  delDebuffImmune(id: string) {
    const key = `${this.debuffImmune}:${id}`;
    return container.redisCache.del(key);
  }

  createRandomEffectCD(id: string, time: number = 7200) {
    const key = `${this.randomEffectCooldown}:${id}`;
    return container.redisCache.set(key, true, time);
  }

  ttlRandomEffectCD(id: string) {
    const key = `${this.randomEffectCooldown}:${id}`;
    return container.redisCache.store.ttl(key);
  }

  async createRandomEffect(id: string) {
    const effects = [this.debuffImmune, this.goditStun];
    const effect = effects[Math.floor(Math.random() * effects.length)];
    if (effect === this.debuffImmune) {
      await this.createDebuffImmune(id);
      return '<:Buff_Icon_Debuff_Immune:899296883858628618>';
    }
    else {
      await this.createGoditStun(id);
      return '<:Buff_Icon_Stun:876858907899883570>';
    }
  }

  createAlter(id: string, targetId: string, time: number = 1800) {
    const key = `${this.alter}:${id}`;
    return container.redisCache.set(key, targetId, time);
  }

  findAlter(id: string) {
    const key = `${this.alter}:${id}`;
    return container.redisCache.get<string>(key);
  }

  delAlter(id: string) {
    const key = `${this.alter}:${id}`;
    return container.redisCache.del(key);
  }

  createAlterCD(id: string, time: number = 7200) {
    const key = `${this.alterCooldown}:${id}`;
    return container.redisCache.set(key, true, time);
  }

  ttlAlterCD(id: string) {
    const key = `${this.alterCooldown}:${id}`;
    return container.redisCache.store.ttl(key);
  }

  createPretend(id: string, targetId: string, time: number = 1800) {
    const key = `${this.pretend}:${id}`;
    return container.redisCache.set(key, targetId, time);
  }

  findPretend(id: string) {
    const key = `${this.pretend}:${id}`;
    return container.redisCache.get<string>(key);
  }

  delPretend(id: string) {
    const key = `${this.pretend}:${id}`;
    return container.redisCache.del(key);
  }

  createPretendCD(id: string, time: number = 7200) {
    const key = `${this.pretendCooldown}:${id}`;
    return container.redisCache.set(key, true, time);
  }

  ttlPretendCD(id: string) {
    const key = `${this.pretendCooldown}:${id}`;
    return container.redisCache.store.ttl(key);
  }
}

export const funService = new FunService();