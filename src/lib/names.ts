const ADJECTIVES = [
  'Amber', 'Atomic', 'Bold', 'Brave', 'Bright', 'Calm', 'Candy', 'Cheerful',
  'Chilly', 'Clever', 'Cobalt', 'Cosmic', 'Crisp', 'Curious', 'Daring', 'Dazzling',
  'Electric', 'Epic', 'Fancy', 'Fearless', 'Fierce', 'Frosty', 'Fuzzy', 'Galactic',
  'Gentle', 'Giant', 'Glowing', 'Golden', 'Groovy', 'Happy', 'Hyper', 'Icy',
  'Inky', 'Jazzy', 'Jolly', 'Jumpy', 'Keen', 'Lively', 'Lucky', 'Lumpy',
  'Lunar', 'Magic', 'Mighty', 'Minty', 'Mystic', 'Neon', 'Noble', 'Peppy',
  'Pixel', 'Plucky', 'Polar', 'Prism', 'Puffy', 'Quick', 'Quirky', 'Rapid',
  'Rogue', 'Royal', 'Rusty', 'Shiny', 'Silly', 'Slick', 'Snappy', 'Solar',
  'Speedy', 'Spicy', 'Spiffy', 'Stealthy', 'Stellar', 'Super', 'Swift', 'Turbo',
  'Vivid', 'Wild', 'Witty', 'Wonky', 'Zany', 'Zippy',
]

const NOUNS = [
  'Axolotl', 'Badger', 'Bandit', 'Bear', 'Beaver', 'Blaze', 'Bolt', 'Cactus',
  'Capybara', 'Cheetah', 'Chimp', 'Cobra', 'Comet', 'Condor', 'Coyote', 'Dingo',
  'Dolphin', 'Dragon', 'Duck', 'Eagle', 'Falcon', 'Ferret', 'Flamingo', 'Fox',
  'Gecko', 'Golem', 'Gorilla', 'Hawk', 'Hedgehog', 'Hippo', 'Husky', 'Iguana',
  'Jackal', 'Jaguar', 'Jellyfish', 'Koala', 'Kraken', 'Lemur', 'Leopard', 'Lion',
  'Lizard', 'Llama', 'Lynx', 'Manta', 'Marmot', 'Meerkat', 'Mongoose', 'Moose',
  'Narwhal', 'Ninja', 'Octopus', 'Orca', 'Osprey', 'Otter', 'Panda', 'Panther',
  'Parrot', 'Penguin', 'Phoenix', 'Piranha', 'Platypus', 'Porcupine', 'Quokka', 'Raccoon',
  'Raptor', 'Raven', 'Rhino', 'Salamander', 'Shark', 'Sloth', 'Snail', 'Sparrow',
  'Squid', 'Stingray', 'Tiger', 'Toucan', 'Walrus', 'Weasel', 'Wolf', 'Wolverine',
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function randomName(): string {
  return pick(ADJECTIVES) + pick(NOUNS)
}
