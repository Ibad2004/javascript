/* eslint-disable func-names */
const Character = require('../src/character');

function Player(config) {
  Character.call(this, config);
  this.equippedWeapon = config.equippedWeapon;
}

Player.prototype = Object.create(Character.prototype);

Object.defineProperty(Player.prototype, 'constructor', {
  value: Player,
  enumerable: false,
  writable: true,
});

Player.prototype._describeAttack = function (target) {
  return `${this.name} lets out a ${this.dialogue}, and hits ${target.name} with ${this.equippedWeapon.name} for ${this.equippedWeapon.damage} damage!`;
};

Player.prototype.equip = function (weapon) {
  this.equippedWeapon = weapon;
};

Player.prototype.attack = function (target) {
  target._takeDamage(this.equippedWeapon.damage);
  return this._describeAttack(target);
};

module.exports = Player;
