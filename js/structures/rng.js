const JAVA_RANDOM_MULTIPLIER = 0x5deece66dn;
const JAVA_RANDOM_ADDEND = 0xbn;
const JAVA_RANDOM_MASK = (1n << 48n) - 1n;

export function createJavaRandom(seed) {
  let currentSeed = (BigInt(seed) ^ JAVA_RANDOM_MULTIPLIER) & JAVA_RANDOM_MASK;

  return {
    next(bits) {
      currentSeed = (currentSeed * JAVA_RANDOM_MULTIPLIER + JAVA_RANDOM_ADDEND) & JAVA_RANDOM_MASK;
      return Number(currentSeed >> (48n - BigInt(bits)));
    },
    nextInt(bound) {
      if (!Number.isInteger(bound) || bound <= 0) {
        throw new Error("bound must be a positive integer");
      }
      if ((bound & -bound) === bound) {
        return Math.floor((bound * this.next(31)) / 2 ** 31);
      }

      let bits;
      let value;
      do {
        bits = this.next(31);
        value = bits % bound;
      } while (bits - value + (bound - 1) < 0);
      return value;
    },
    nextDouble() {
      return (this.next(26) * 2 ** 27 + this.next(27)) / 2 ** 53;
    },
  };
}
