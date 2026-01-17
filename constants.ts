
import { LevelData } from './types';

export const MAX_LIVES = 3;

export const LEVELS: LevelData[] = [
  {
    levelNumber: 1,
    title: "The Iron Gates",
    ghostVibe: "A weary, ancient gatekeeper who has seen centuries of children fail to enter.",
    description: "The storm broke Ace's bike. The massive gates of the Manor are the only shelter from the unnatural cold.",
    mysteryPrompt: "The gate is locked by the gargoyle's grief. How will you enter?",
    choices: [
      { text: "Reach into the weeping gargoyle's mouth", isCorrect: true, consequence: "Your fingers brush against freezing metal. You pull out a Rusted Key.", itemFound: "Rusted Key" },
      { text: "Try to scale the sharp iron bars", isCorrect: false, consequence: "The iron becomes impossibly slippery and freezing. You fall into the mud." },
      { text: "Scream for help through the bars", isCorrect: false, consequence: "The house hears you. A window shatters, and the gravel begins to swirl." }
    ]
  },
  {
    levelNumber: 2,
    title: "The Dust-Choked Library",
    ghostVibe: "An obsessive, whispering librarian who speaks in riddles and hates the sound of breathing.",
    description: "The doors slammed shut. You're trapped in a room of infinite books. A ladder slides on its own through the darkness.",
    mysteryPrompt: "A secret passage is behind a shelf, but the books are shifting like a puzzle.",
    choices: [
      { text: "Use the Rusted Key on the clock", isCorrect: true, consequence: "The clock strikes a hollow tone. A shelf of blue books swings back.", itemRequired: "Rusted Key", itemFound: "Old Map" },
      { text: "Search for a book titled 'The Way Out'", isCorrect: false, consequence: "The books fly off the shelves, their pages sharp as razors." },
      { text: "Climb the shaky rolling ladder", isCorrect: false, consequence: "The ladder accelerates toward a brick wall at high speed." }
    ]
  },
  {
    levelNumber: 3,
    title: "The Forgotten Kitchen",
    ghostVibe: "A manic, fire-obsessed chef who is constantly trying to 'season' the air with fear.",
    description: "The Old Map shows a way through the pantry. But a blue spectral fire burns on the stove, blocking your path.",
    mysteryPrompt: "The heat is freezing cold. The stove is screaming. How do you pass?",
    choices: [
      { text: "Throw silver salt onto the blue flames", isCorrect: true, consequence: "The salt turns the fire white. You grab a Brass Flashlight and sprint past.", itemFound: "Brass Flashlight" },
      { text: "Try to run through the cold fire", isCorrect: false, consequence: "The blue fire freezes your joints, leaving you vulnerable to the Chef." },
      { text: "Douse the fire with stagnant water", isCorrect: false, consequence: "The water turns to steam, filling the room with a whispering fog." }
    ]
  },
  {
    levelNumber: 4,
    title: "The Whispering Gallery",
    ghostVibe: "A lonely child ghost who wants to play 'hide and seek' forever.",
    description: "It's pitch black. The whispers are coming from inside the walls, telling you secrets about your own past.",
    mysteryPrompt: "The hallway stretches for miles in the dark. How will you see?",
    choices: [
      { text: "Shine the Brass Flashlight at the ceiling", isCorrect: true, consequence: "The light reflects into a thousand beams, burning the gloom. You find a Winding Key.", itemRequired: "Brass Flashlight", itemFound: "Winding Key" },
      { text: "Feel your way along the wallpaper", isCorrect: false, consequence: "The patterns on the wallpaper become hands. They pull you into the drywall." },
      { text: "Sing a song to keep your courage up", isCorrect: false, consequence: "The echo returns as a thousand twisted voices singing a funeral march." }
    ]
  },
  {
    levelNumber: 5,
    title: "The Attic of Lost Toys",
    ghostVibe: "A mechanical, stiff dollmaker who moves like a clockwork toy with broken springs.",
    description: "Dolls watch you with glass eyes. A giant mechanical soldier blocks the trapdoor.",
    mysteryPrompt: "The soldier needs a 'Heart of Gears' to let you pass. Where is it?",
    choices: [
      { text: "Place the Winding Key in the heart-slot", isCorrect: true, consequence: "The soldier clicks aside. He drops a Silver Locket. You take it.", itemRequired: "Winding Key", itemFound: "Silver Locket" },
      { text: "Try to dismantle the soldier", isCorrect: false, consequence: "His lead hands crush your wrist. The dolls crawl out of their boxes." },
      { text: "Distract the dolls with marbles", isCorrect: false, consequence: "The dolls catch the marbles and throw them back with impossible speed." }
    ]
  },
  {
    levelNumber: 6,
    title: "The Conservatory of Dead Vines",
    ghostVibe: "A prickly, ancient gardener who has become one with the thorns and black roses.",
    description: "The Silver Locket starts glowing with a blue light. The vines here pulsate like a beating heart.",
    mysteryPrompt: "The exit is choked by thorns. The gardener is reaching out. What do you give?",
    choices: [
      { text: "Offer the Silver Locket to the gardener", isCorrect: true, consequence: "The glow calms the vines. They wither back, revealing a Mirror Shard.", itemRequired: "Silver Locket", itemFound: "Mirror Shard" },
      { text: "Try to hack through the vines", isCorrect: false, consequence: "The thorns wrap around your throat and pull you into the dark mulch." },
      { text: "Hide in the giant glass terrarium", isCorrect: false, consequence: "The glass becomes opaque. The gardener taps on the outside, laughing." }
    ]
  },
  {
    levelNumber: 7,
    title: "The Grand Ballroom",
    ghostVibe: "An elegant but decaying ballerina who dances on shards of broken memories.",
    description: "A faceless dance is occurring. The floor is a mosaic of traps. The music is a scratchy violin.",
    mysteryPrompt: "The dancers are blocking the exit. How do you find the true door?",
    choices: [
      { text: "Use the Mirror Shard to look backwards", isCorrect: true, consequence: "The shard reveals that the exit is a painting. You walk through the canvas.", itemRequired: "Mirror Shard" },
      { text: "Try to join the dance", isCorrect: false, consequence: "Your feet become heavy. You are turning into a stone statue." },
      { text: "Sprint across the dance floor", isCorrect: false, consequence: "The tiles flip like hungry mouths. You fall into the cellar of bones." }
    ]
  },
  {
    levelNumber: 8,
    title: "The Mirror Hallway",
    ghostVibe: "A mischievous reflection ghost who mimics your move with a sinister delay.",
    description: "Every mirror shows a darker version of Ace. One Ace is holding the way out, but his eyes are black.",
    mysteryPrompt: "Which mirror is the real door? The locket is vibrating.",
    choices: [
      { text: "Touch the mirror reflecting the locket's glow", isCorrect: true, consequence: "The glass becomes liquid. You step through into the Master Bedchamber.", itemRequired: "Silver Locket" },
      { text: "Touch the mirror showing your parents", isCorrect: false, consequence: "It's a Trap. The glass sucks you into a void of 'Could-Have-Beens'." },
      { text: "Break the mirrors with the Rusted Key", isCorrect: false, consequence: "Seven spectral wolves made of glass shards manifest instantly." }
    ]
  },
  {
    levelNumber: 9,
    title: "The Master Bedchamber",
    ghostVibe: "A deep, booming 'Master of the House' who sounds like ancient storms.",
    description: "The breathing behind the curtains is deafening. The bed is as large as a ship.",
    mysteryPrompt: "The 'Master' is shifting in his sleep. His shadow is growing. Where is the key?",
    choices: [
      { text: "Blaze the Flashlight at the curtains", isCorrect: true, consequence: "The Master hisses and retreats. You grab the Cellar Key.", itemRequired: "Brass Flashlight", itemFound: "Cellar Key" },
      { text: "Crawl under the bed to hide", isCorrect: false, consequence: "There are things under the bed that pull you down into the dark." },
      { text: "Whisper a lullaby", isCorrect: false, consequence: "The Master hates music. He opens his eyes—vast voids that swallow your light." }
    ]
  },
  {
    levelNumber: 10,
    title: "The Secret Cellar",
    ghostVibe: "A chorus of all the ghosts you've met, their voices merging into one final judgment.",
    description: "The ritual circle is complete. Ace sees his name on a stone. The air is freezing.",
    mysteryPrompt: "The house wants its final payment. Will you accept the key?",
    choices: [
      { text: "Insert the Cellar Key into the stone", isCorrect: true, consequence: "The lock turns. The world goes black. Ace steps into the dark forever.", itemRequired: "Cellar Key" },
      { text: "Try to run back up the stairs", isCorrect: false, consequence: "The stairs collapse. There is only the void below, and it is hungry." },
      { text: "Throw items into the ritual circle", isCorrect: false, consequence: "The shadows consume the items and then turn their hunger toward you." }
    ]
  }
];
