function Weapon(config) {
  if (config === null || typeof config !== 'object') {
    throw new TypeError('Weapon needs a config object (name, damage, attackType)');
  }
  this.name = config.name;
  this.damage = config.damage;
  this.attackType = config.attackType;
}

module.exports = Weapon;
