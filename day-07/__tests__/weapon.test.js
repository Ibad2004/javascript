const Weapon = require('../src/weapon');

describe('constructor function', () => {
  let weapon;
  let config;
  beforeEach(() => {
    config = {
      name: 'bronze sword',
      damage: 3,
      attackType: 'slashes',
    };
    weapon = new Weapon(config);
  });
  it('returns an object', () => {
    expect(weapon).toBeInstanceOf(Object);
  });
  it('has a name', () => {
    expect(weapon.name).toBe(config.name);
  });
  it('has a damage rating', () => {
    expect(weapon.damage).toBe(config.damage);
  });
  it('has an attack type', () => {
    expect(weapon.attackType).toBe(config.attackType);
  });
});
