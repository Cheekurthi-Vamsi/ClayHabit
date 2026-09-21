/**
 * The curated habit icon set. This file is the single source of truth: the
 * extraction script (`scripts/extract-habit-icons.mjs`) reads it to fetch the
 * SVGs from Iconify, and the app reads it for labels, categories and search.
 *
 * Keep it plain, erasable TypeScript with no imports — Node runs it directly.
 *
 * - Line icons: Tabler Icons (MIT), drawn in white on the habit's gradient.
 * - Emoji: Microsoft Fluent Emoji Flat (MIT), drawn in full colour.
 *
 * Every entry carries a Unicode emoji so the habit still reads well anywhere
 * that only plain text works.
 */

export type HabitIconCategory =
  | 'health'
  | 'fitness'
  | 'mind'
  | 'learn'
  | 'create'
  | 'work'
  | 'home'
  | 'money'
  | 'social'
  | 'quit';

export const ICON_CATEGORIES: readonly { key: HabitIconCategory; label: string }[] = [
  { key: 'health', label: 'Health' },
  { key: 'fitness', label: 'Fitness' },
  { key: 'mind', label: 'Mind' },
  { key: 'learn', label: 'Learn' },
  { key: 'create', label: 'Create' },
  { key: 'work', label: 'Work' },
  { key: 'home', label: 'Home' },
  { key: 'money', label: 'Money' },
  { key: 'social', label: 'Social' },
  { key: 'quit', label: 'Quit' },
];

export type HabitIconKind = 'line' | 'emoji';

export interface HabitIconDef {
  /** Stored on the habit, e.g. `line:run` or `emoji:droplet`. */
  id: string;
  kind: HabitIconKind;
  /** Icon name inside its Iconify set. */
  source: string;
  label: string;
  category: HabitIconCategory;
  /** Plain-text stand-in. */
  emoji: string;
  /** Extra search terms, space separated. */
  keywords: string;
}

/** [iconify name, label, emoji, keywords] */
type Row = readonly [string, string, string, string?];

const LINE_ROWS: Record<HabitIconCategory, readonly Row[]> = {
  health: [
    ['droplet', 'Water', '💧', 'drink hydrate'],
    ['glass-full', 'Glass', '🥛', 'drink milk juice'],
    ['apple', 'Fruit', '🍎', 'eat healthy'],
    ['salad', 'Salad', '🥗', 'eat greens diet'],
    ['carrot', 'Veggies', '🥕', 'vegetables eat'],
    ['pill', 'Vitamins', '💊', 'medicine supplement'],
    ['heart-rate-monitor', 'Heart', '❤️', 'cardio health'],
    ['bed', 'Sleep', '🛏️', 'bedtime rest'],
    ['moon', 'Night', '🌙', 'sleep evening'],
    ['sun', 'Sunlight', '☀️', 'morning outside'],
    ['dental', 'Teeth', '🦷', 'floss brush'],
    ['bath', 'Bath', '🛁', 'shower skincare'],
    ['scale', 'Weigh-in', '⚖️', 'weight'],
    ['stethoscope', 'Check-up', '🩺', 'doctor'],
    ['eye', 'Eyes', '👁️', 'screen break'],
    ['zzz', 'Nap', '😴', 'sleep rest'],
  ],
  fitness: [
    ['run', 'Run', '🏃', 'jog cardio'],
    ['walk', 'Walk', '🚶', 'steps'],
    ['swimming', 'Swim', '🏊', 'pool'],
    ['bike', 'Cycle', '🚴', 'bicycle ride'],
    ['yoga', 'Yoga', '🧘', 'stretch'],
    ['stretching', 'Stretch', '🤸', 'mobility'],
    ['barbell', 'Lift', '🏋️', 'gym weights strength workout'],
    ['treadmill', 'Treadmill', '🏃', 'gym cardio'],
    ['ball-football', 'Football', '⚽', 'soccer sport'],
    ['ball-basketball', 'Basketball', '🏀', 'sport'],
    ['mountain', 'Hike', '⛰️', 'outdoors climb'],
    ['stairs', 'Stairs', '🪜', 'climb steps'],
    ['jump-rope', 'Jump rope', '🪢', 'skipping cardio'],
    ['heartbeat', 'Cardio', '💓', 'hiit'],
  ],
  mind: [
    ['brain', 'Meditate', '🧠', 'mind focus mindfulness'],
    ['pray', 'Pray', '🙏', 'faith gratitude'],
    ['heart-handshake', 'Kindness', '💗', 'gratitude help'],
    ['mood-smile', 'Mood', '😊', 'happy smile'],
    ['sparkles', 'Self-care', '✨', 'glow'],
    ['leaf', 'Calm', '🍃', 'nature breathe'],
    ['flower', 'Bloom', '🌸', 'nature'],
    ['sunrise', 'Wake early', '🌅', 'morning'],
    ['sunset', 'Wind down', '🌇', 'evening'],
    ['tree', 'Outdoors', '🌳', 'nature walk'],
  ],
  learn: [
    ['book', 'Read', '📖', 'book pages'],
    ['books', 'Library', '📚', 'read study'],
    ['notebook', 'Journal', '📓', 'diary write'],
    ['writing', 'Write', '✍️', 'journal blog'],
    ['pencil', 'Notes', '✏️', 'write sketch'],
    ['language', 'Language', '🗣️', 'duolingo speak learn'],
    ['school', 'Study', '🎓', 'class course'],
    ['code', 'Code', '💻', 'programming develop'],
    ['calculator', 'Math', '🧮', 'numbers'],
    ['bulb', 'Ideas', '💡', 'learn think'],
    ['headphones', 'Podcast', '🎧', 'listen audiobook'],
    ['microphone', 'Speak', '🎤', 'practice voice'],
  ],
  create: [
    ['palette', 'Paint', '🎨', 'art color'],
    ['brush', 'Draw', '🖌️', 'art sketch'],
    ['camera', 'Photo', '📷', 'photography'],
    ['music', 'Music', '🎵', 'song listen'],
    ['guitar-pick', 'Guitar', '🎸', 'practice instrument'],
    ['piano', 'Piano', '🎹', 'practice instrument'],
    ['movie', 'Film', '🎬', 'video'],
    ['device-gamepad-2', 'Games', '🎮', 'play'],
  ],
  work: [
    ['checklist', 'To-dos', '✅', 'tasks plan'],
    ['target', 'Goal', '🎯', 'focus aim'],
    ['clock', 'Time', '🕒', 'hours'],
    ['alarm', 'Alarm', '⏰', 'wake up'],
    ['calendar-check', 'Plan day', '📅', 'schedule'],
    ['briefcase', 'Work', '💼', 'job'],
    ['device-laptop', 'Laptop', '💻', 'computer'],
    ['inbox', 'Inbox zero', '📥', 'email'],
    ['focus-2', 'Deep work', '🎯', 'focus'],
    ['rocket', 'Ship', '🚀', 'launch project'],
    ['trophy', 'Win', '🏆', 'achievement'],
    ['flag', 'Milestone', '🚩', 'goal'],
  ],
  home: [
    ['home', 'Home', '🏠', 'house'],
    ['bucket', 'Clean', '🪣', 'chores mop'],
    ['wash-machine', 'Laundry', '🧺', 'clothes wash'],
    ['tools-kitchen-2', 'Cook', '🍳', 'meal kitchen'],
    ['plant', 'Plants', '🪴', 'water plants'],
    ['plant-2', 'Garden', '🌱', 'grow'],
    ['dog', 'Dog', '🐕', 'walk pet'],
    ['cat', 'Cat', '🐈', 'pet'],
    ['paw', 'Pets', '🐾', 'feed animal'],
    ['trash', 'Trash', '🗑️', 'bins declutter'],
    ['shopping-cart', 'Groceries', '🛒', 'shop'],
    ['sofa', 'Tidy', '🛋️', 'declutter room'],
    ['shirt', 'Outfit', '👕', 'clothes'],
  ],
  money: [
    ['pig-money', 'Save', '🐷', 'savings piggy'],
    ['wallet', 'Budget', '👛', 'spend'],
    ['coin', 'Coins', '🪙', 'money'],
    ['receipt', 'Expenses', '🧾', 'track spending'],
    ['chart-line', 'Invest', '📈', 'stocks'],
    ['cash', 'Cash', '💵', 'money'],
  ],
  social: [
    ['users', 'Family', '👨‍👩‍👧', 'friends people'],
    ['phone-call', 'Call', '📞', 'phone parents'],
    ['message-circle', 'Message', '💬', 'text chat'],
    ['heart', 'Love', '❤️', 'partner date'],
    ['gift', 'Gift', '🎁', 'kindness'],
    ['mail', 'Email', '✉️', 'letter'],
  ],
  quit: [
    ['smoking-no', 'No smoking', '🚭', 'quit cigarettes'],
    ['beer-off', 'No alcohol', '🚫', 'sober drink'],
    ['device-mobile-off', 'No phone', '📵', 'screen time social media'],
    ['candy-off', 'No sugar', '🍬', 'sweets'],
    ['device-tv-off', 'No TV', '📺', 'screen'],
    ['cookie-off', 'No snacks', '🍪', 'junk food'],
    ['coffee-off', 'No coffee', '☕', 'caffeine'],
  ],
};

const EMOJI_ROWS: Record<HabitIconCategory, readonly Row[]> = {
  health: [
    ['droplet', 'Water', '💧', 'drink hydrate'],
    ['glass-of-milk', 'Milk', '🥛', 'drink'],
    ['red-apple', 'Apple', '🍎', 'fruit eat'],
    ['green-salad', 'Salad', '🥗', 'eat greens'],
    ['carrot', 'Carrot', '🥕', 'veggies'],
    ['broccoli', 'Broccoli', '🥦', 'veggies'],
    ['avocado', 'Avocado', '🥑', 'eat'],
    ['banana', 'Banana', '🍌', 'fruit'],
    ['pill', 'Pill', '💊', 'vitamins medicine'],
    ['tooth', 'Tooth', '🦷', 'floss brush'],
    ['bed', 'Bed', '🛏️', 'sleep'],
    ['sleeping-face', 'Sleep', '😴', 'rest'],
    ['zzz', 'Zzz', '💤', 'nap sleep'],
    ['crescent-moon', 'Moon', '🌙', 'night'],
    ['sun-with-face', 'Sun', '🌞', 'morning'],
    ['hot-beverage', 'Coffee', '☕', 'tea'],
    ['teacup-without-handle', 'Green tea', '🍵', 'drink'],
    ['anatomical-heart', 'Heart', '🫀', 'cardio'],
    ['lungs', 'Breathe', '🫁', 'breathing'],
    ['stethoscope', 'Doctor', '🩺', 'check-up'],
    ['soap', 'Soap', '🧼', 'wash'],
    ['bathtub', 'Bath', '🛁', 'relax'],
    ['shower', 'Shower', '🚿', 'cold shower'],
    ['lotion-bottle', 'Skincare', '🧴', 'sunscreen'],
    ['toothbrush', 'Toothbrush', '🪥', 'brush teeth'],
  ],
  fitness: [
    ['person-running', 'Running', '🏃', 'jog run'],
    ['person-walking', 'Walking', '🚶', 'steps walk'],
    ['person-swimming', 'Swimming', '🏊', 'swim'],
    ['bicycle', 'Bicycle', '🚲', 'cycle bike'],
    ['person-lifting-weights', 'Weights', '🏋️', 'gym lift'],
    ['flexed-biceps', 'Strength', '💪', 'workout gym'],
    ['snow-capped-mountain', 'Mountain', '🏔️', 'hike'],
    ['soccer-ball', 'Football', '⚽', 'soccer'],
    ['basketball', 'Basketball', '🏀', 'sport'],
    ['tennis', 'Tennis', '🎾', 'sport'],
    ['boxing-glove', 'Boxing', '🥊', 'fight'],
    ['skis', 'Ski', '🎿', 'snow'],
    ['high-voltage', 'Energy', '⚡', 'hiit power'],
  ],
  mind: [
    ['person-in-lotus-position', 'Meditate', '🧘', 'yoga mindful'],
    ['folded-hands', 'Gratitude', '🙏', 'pray thanks'],
    ['brain', 'Brain', '🧠', 'mind'],
    ['lotus', 'Lotus', '🪷', 'calm'],
    ['smiling-face-with-smiling-eyes', 'Happy', '😊', 'mood smile'],
    ['relieved-face', 'Relax', '😌', 'calm'],
    ['sparkles', 'Sparkles', '✨', 'self-care'],
    ['red-heart', 'Heart', '❤️', 'love'],
    ['heart-hands', 'Kindness', '🫶', 'love'],
    ['thought-balloon', 'Reflect', '💭', 'think'],
    ['rainbow', 'Rainbow', '🌈', 'positive'],
    ['four-leaf-clover', 'Luck', '🍀', 'positive'],
    ['seedling', 'Grow', '🌱', 'growth'],
    ['cherry-blossom', 'Blossom', '🌸', 'nature'],
    ['sunflower', 'Sunflower', '🌻', 'nature'],
    ['deciduous-tree', 'Tree', '🌳', 'outdoors nature'],
    ['sunrise', 'Sunrise', '🌅', 'wake early'],
    ['water-wave', 'Wave', '🌊', 'ocean calm'],
  ],
  learn: [
    ['open-book', 'Read', '📖', 'book'],
    ['books', 'Books', '📚', 'read study'],
    ['notebook', 'Notebook', '📓', 'journal'],
    ['memo', 'Memo', '📝', 'write notes'],
    ['writing-hand', 'Write', '✍️', 'journal'],
    ['pencil', 'Pencil', '✏️', 'sketch'],
    ['graduation-cap', 'Study', '🎓', 'school course'],
    ['light-bulb', 'Idea', '💡', 'learn think'],
    ['globe-showing-europe-africa', 'Language', '🌍', 'world learn'],
    ['laptop', 'Laptop', '💻', 'code'],
    ['test-tube', 'Science', '🧪', 'experiment'],
    ['puzzle-piece', 'Puzzle', '🧩', 'brain'],
    ['headphone', 'Listen', '🎧', 'podcast audiobook'],
  ],
  create: [
    ['artist-palette', 'Art', '🎨', 'paint'],
    ['paintbrush', 'Paint', '🖌️', 'draw'],
    ['camera', 'Camera', '📷', 'photo'],
    ['musical-notes', 'Music', '🎶', 'song'],
    ['guitar', 'Guitar', '🎸', 'instrument'],
    ['drum', 'Drums', '🥁', 'instrument'],
    ['trumpet', 'Trumpet', '🎺', 'instrument'],
    ['microphone', 'Sing', '🎤', 'karaoke'],
    ['movie-camera', 'Film', '🎥', 'video'],
    ['video-game', 'Games', '🎮', 'play'],
  ],
  work: [
    ['check-mark-button', 'Done', '✅', 'tasks'],
    ['alarm-clock', 'Alarm', '⏰', 'wake up'],
    ['stopwatch', 'Timer', '⏱️', 'focus'],
    ['calendar', 'Calendar', '📅', 'plan'],
    ['hourglass-not-done', 'Hourglass', '⏳', 'time'],
    ['rocket', 'Rocket', '🚀', 'launch ship'],
    ['trophy', 'Trophy', '🏆', 'win'],
    ['glowing-star', 'Star', '🌟', 'shine'],
    ['fire', 'Fire', '🔥', 'streak'],
    ['hundred-points', '100', '💯', 'perfect'],
    ['chart-increasing', 'Growth', '📈', 'progress'],
    ['clipboard', 'Clipboard', '📋', 'checklist'],
    ['pushpin', 'Pin', '📌', 'priority'],
  ],
  home: [
    ['house', 'House', '🏠', 'home'],
    ['broom', 'Sweep', '🧹', 'clean chores'],
    ['basket', 'Laundry', '🧺', 'clothes'],
    ['cooking', 'Cook', '🍳', 'meal breakfast'],
    ['potted-plant', 'Plant', '🪴', 'water plants'],
    ['dog-face', 'Dog', '🐶', 'pet walk'],
    ['cat-face', 'Cat', '🐱', 'pet'],
    ['paw-prints', 'Pets', '🐾', 'animal'],
    ['shopping-cart', 'Groceries', '🛒', 'shop'],
    ['wastebasket', 'Trash', '🗑️', 'declutter'],
    ['sponge', 'Dishes', '🧽', 'clean wash'],
  ],
  money: [
    ['money-bag', 'Money', '💰', 'save'],
    ['coin', 'Coin', '🪙', 'save'],
    ['dollar-banknote', 'Cash', '💵', 'money'],
    ['credit-card', 'Card', '💳', 'spend budget'],
    ['bank', 'Bank', '🏦', 'savings invest'],
    ['gem-stone', 'Gem', '💎', 'value'],
  ],
  social: [
    ['telephone-receiver', 'Call', '📞', 'phone family'],
    ['speech-balloon', 'Chat', '💬', 'message'],
    ['handshake', 'Network', '🤝', 'meet'],
    ['people-hugging', 'Hug', '🫂', 'family friends'],
    ['envelope', 'Letter', '✉️', 'mail'],
    ['clinking-glasses', 'Celebrate', '🥂', 'friends'],
    ['birthday-cake', 'Birthday', '🎂', 'celebrate'],
  ],
  quit: [
    ['no-smoking', 'No smoking', '🚭', 'quit cigarettes'],
    ['no-entry', 'Stop', '⛔', 'quit avoid'],
    ['mobile-phone-off', 'Phone off', '📴', 'screen time'],
    ['wine-glass', 'Alcohol', '🍷', 'sober drink'],
    ['candy', 'Candy', '🍬', 'sugar'],
    ['cookie', 'Cookie', '🍪', 'snacks sugar'],
    ['doughnut', 'Doughnut', '🍩', 'junk food'],
    ['television', 'TV', '📺', 'screen time'],
  ],
};

function expand(kind: HabitIconKind, rows: Record<HabitIconCategory, readonly Row[]>): HabitIconDef[] {
  return ICON_CATEGORIES.flatMap(({ key: category }) =>
    rows[category].map(([source, label, emoji, keywords]) => ({
      id: `${kind}:${source}`,
      kind,
      source,
      label,
      category,
      emoji,
      keywords: keywords ?? '',
    })),
  );
}

export const LINE_ICONS: readonly HabitIconDef[] = expand('line', LINE_ROWS);
export const EMOJI_ICONS: readonly HabitIconDef[] = expand('emoji', EMOJI_ROWS);

/** Iconify collections each kind is extracted from. */
export const ICON_SETS: Record<HabitIconKind, string> = {
  line: 'tabler',
  emoji: 'fluent-emoji-flat',
};
