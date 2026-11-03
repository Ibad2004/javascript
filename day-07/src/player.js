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

Player.prototype._describeAttack = function () {
  return `${this.name} lets out a ${this.dialogue}, and hits ${this.target.name} with ${this.equippedWeapon.name} for ${this.equippedWeapon.damage} damage!`;
};

Player.prototype.equip = function (weapon) {
  this.equippedWeapon = this.weapon;
};

Player.prototype.attack = function (target) {
  target._takeDamage(this.weapon.damage);
  return this._describeAttack(enemy);
};

module.export = Player;
