import { add, circleArea, PI } from "./math.js";
import formatPrice, { shout } from "./format.js";
import * as math from "./math.js";

console.log(add(2, 3));
console.log(circleArea(2).toFixed(2));
console.log(PI);

console.log(formatPrice(150000));
console.log(shout("modules work"));

console.log(math.add(10, 20));
console.log(typeof math.secretHelper);
