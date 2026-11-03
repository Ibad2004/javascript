/* eslint-disable func-names */
const Enemy = require('../src/enemy');

describe('enemy', () => {
  let enemy;
  let config;
  let victim;
  beforeEach(() => {
    victim = {
      name: 'Townsperson',
      health: 10,
      maxHealth: 10,
      _takeDamage: function (damage) {
        this.health -= damage;
      },
    };
    config = {
      name: 'skeleton',
      health: 10,
      maxHealth: 10,
      dialogue: 'rattle',
      damage: 2,
    };
    enemy = new Enemy(config);
  });
  describe('constructor function', () => {
    it('returns an object', () => {
      expect(enemy).toBeInstanceOf(Object);
    });
    it('inherits from Character', () => {
      expect(enemy.name).toBe(config.name);
      expect(enemy.health).toBe(config.health);
      expect(enemy.maxHealth).toBe(config.maxHealth);
      expect(enemy.dialogue).toBe(config.dialogue);
    });
    it('has a damage rating', () => {
      expect(enemy.damage).toBe(config.damage);
    });
  });
  describe('attack', () => {
    it('can attack a target', () => {
      enemy.attack(victim);
      expect(victim.health).toBe(victim.maxHealth - enemy.damage);
    });
    it('can describe its attack', () => {
      const attackLine = `${enemy.name} lets out a ${enemy.dialogue}, and hits ${victim.name} for ${config.damage} damage!`;
      expect(enemy.attack(victim)).toBe(attackLine);
    });
  });
});
