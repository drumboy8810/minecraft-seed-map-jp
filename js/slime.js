const MULTIPLIER = 0x5DEECE66Dn;
const ADDEND = 0xBn;
const MASK = (1n << 48n) - 1n;

export function seedToJavaLong(seedText) {
  const trimmed = String(seedText).trim();
  if (/^[+-]?\d+$/.test(trimmed)) {
    return BigInt(trimmed);
  }
  return BigInt(javaStringHashCode(trimmed));
}

export function javaStringHashCode(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return hash;
}

export function isSlimeChunk(worldSeed, chunkX, chunkZ, edition = "java") {
  if (edition !== "java") {
    return false;
  }

  const x = BigInt(chunkX);
  const z = BigInt(chunkZ);
  const slimeSeed =
    BigInt(worldSeed) +
    x * x * 4987142n +
    x * 5947611n +
    z * z * 4392871n +
    z * 389711n;

  const random = new JavaRandom(slimeSeed ^ 987234911n);
  return random.nextInt(10) === 0;
}

class JavaRandom {
  constructor(seed) {
    this.seed = (seed ^ MULTIPLIER) & MASK;
  }

  next(bits) {
    this.seed = (this.seed * MULTIPLIER + ADDEND) & MASK;
    return Number(this.seed >> (48n - BigInt(bits)));
  }

  nextInt(bound) {
    if (bound <= 0) {
      throw new Error("bound must be positive");
    }

    if ((bound & -bound) === bound) {
      return Math.floor((bound * this.next(31)) / 0x80000000);
    }

    let bits;
    let value;
    do {
      bits = this.next(31);
      value = bits % bound;
    } while (bits - value + (bound - 1) < 0);

    return value;
  }
}
