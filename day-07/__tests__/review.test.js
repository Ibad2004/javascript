const Character = require('../src/character');
const Enemy = require('../src/enemy');
const Player = require('../src/player');
const Weapon = require('../src/weapon');

const base = { name: 'Hero', health: 10, maxHealth: 10, dialogue: 'hi' };
const sword = { name: 'bronze sword', damage: 3, attackType: 'slashes' };

describe('player without a weapon', () => {
  it('starts with no weapon', () => {
    expect(new Player(base).equippedWeapon).toBeNull();
  });
  it('attacks with 0 damage and returns normally', () => {
    const target = new Character(base);
    let result;
    expect(() => {
      result = new Player(base).attack(target);
    }).not.toThrow();
    expect(result).toContain('0 damage');
    expect(target.health).toBe(10);
  });
  it('attacks normally once a weapon is equipped', () => {
    const player = new Player(base);
    const target = new Character(base);
    player.equip(sword);
    expect(player.attack(target)).toContain('bronze sword');
    expect(target.health).toBe(7);
  });
});

describe('negative damage', () => {
  it('counts as 0 and never heals', () => {
    const target = new Character({ ...base, health: 5 });
    expect(() => target._takeDamage(-3)).not.toThrow();
    expect(target.health).toBe(5);
  });
  it('a weapon with negative damage does 0 damage', () => {
    const player = new Player(base);
    const target = new Character({ ...base, health: 5 });
    player.equip({ ...sword, damage: -4 });
    expect(() => player.attack(target)).not.toThrow();
    expect(target.health).toBe(5);
  });
  it('an enemy with negative damage does 0 damage', () => {
    const enemy = new Enemy({ ...base, damage: -2 });
    const target = new Character({ ...base, health: 5 });
    enemy.attack(target);
    expect(target.health).toBe(5);
  });
  it('rejects NaN and non-numbers', () => {
    const target = new Character(base);
    for (const bad of [NaN, '3', null, undefined]) {
      expect(() => target._takeDamage(bad)).toThrow(TypeError);
    }
    expect(target.health).toBe(10);
  });
  it('0 damage is allowed', () => {
    const target = new Character(base);
    target._takeDamage(0);
    expect(target.health).toBe(10);
  });
});

describe('attack without a target', () => {
  it.each([undefined, null, {}, 'dummy'])('player: %p gives a clear error', (bad) => {
    const player = new Player(base);
    player.equip(sword);
    expect(() => player.attack(bad)).toThrow('attack needs a target that can take damage');
  });
  it.each([undefined, null, {}])('enemy: %p gives a clear error', (bad) => {
    const enemy = new Enemy({ ...base, damage: 2 });
    expect(() => enemy.attack(bad)).toThrow('attack needs a target that can take damage');
  });
});

describe('missing config', () => {
  it.each([
    ['Character', Character, 'Character needs a config object'],
    ['Player', Player, 'Character needs a config object'],
    ['Enemy', Enemy, 'Character needs a config object'],
    ['Weapon', Weapon, 'Weapon needs a config object'],
  ])('%s without config', (_name, Ctor, message) => {
    expect(() => new Ctor()).toThrow(message);
    expect(() => new Ctor(null)).toThrow(TypeError);
  });
});
