/* eslint-disable func-names */
function Character(config) {
  if (config === null || typeof config !== 'object') {
    throw new TypeError('Character needs a config object (name, health, maxHealth, dialogue)');
  }
  this.name = config.name;
  this.health = config.health;
  this.maxHealth = config.maxHealth;
  this.dialogue = config.dialogue;
}

Character.prototype = {
  get isAlive() {
    return this.health > 0;
  },
  _takeDamage: function (damage) {
    if (typeof damage !== 'number' || Number.isNaN(damage)) {
      throw new TypeError(`damage must be a number, got ${String(damage)}`);
    }
    if (damage < 0) {
      damage = 0; // negative damage counts as 0, it never heals
    }
    this.health -= damage;
    if (this.health < 0) {
      this.health = 0;
    }
  },
  _heal: function (health) {
    this.health += health;
    if (this.health > this.maxHealth) {
      this.health = this.maxHealth;
    }
  },
  speak: function () {
    return this.dialogue;
  },
};

module.exports = Character;
