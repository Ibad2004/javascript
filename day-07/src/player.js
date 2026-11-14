/* eslint-disable func-names */
const Character = require('./character');

function Player(config) {
  Character.call(this, config);
  this.equippedWeapon = config.equippedWeapon === undefined ? null : config.equippedWeapon;
}

Player.prototype = Object.create(Character.prototype);

Object.defineProperty(Player.prototype, 'constructor', {
  value: Player,
  enumerable: false,
  writable: true,
});

Player.prototype._weaponDamage = function () {
  const damage = this.equippedWeapon ? this.equippedWeapon.damage : 0;
  return typeof damage === 'number' && damage > 0 ? damage : 0;
};

Player.prototype._describeAttack = function (target) {
  const weapon = this.equippedWeapon ? this.equippedWeapon.name : 'bare hands';
  return `${this.name} lets out a ${this.dialogue}, and hits ${target.name} with ${weapon} for ${this._weaponDamage()} damage!`;
};

Player.prototype.equip = function (weapon) {
  this.equippedWeapon = weapon;
};

Player.prototype.attack = function (target) {
  if (target === null || typeof target !== 'object' || typeof target._takeDamage !== 'function') {
    throw new TypeError('attack needs a target that can take damage');
  }
  target._takeDamage(this._weaponDamage());
  return this._describeAttack(target);
};

module.exports = Player;
