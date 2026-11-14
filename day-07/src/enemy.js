/* eslint-disable func-names */
const Character = require('./character');

function Enemy(config) {
  Character.call(this, config);
  this.damage = config.damage;
}

Enemy.prototype = Object.create(Character.prototype);

Object.defineProperty(Enemy.prototype, 'constructor', {
  value: Enemy,
  enumerable: false,
  writable: true,
});

Enemy.prototype._describeAttack = function (target) {
  return `${this.name} lets out a ${this.dialogue}, and hits ${target.name} for ${this.damage} damage!`;
};

Enemy.prototype.attack = function (target) {
  if (target === null || typeof target !== 'object' || typeof target._takeDamage !== 'function') {
    throw new TypeError('attack needs a target that can take damage');
  }
  target._takeDamage(this.damage);
  return this._describeAttack(target);
};

module.exports = Enemy;
