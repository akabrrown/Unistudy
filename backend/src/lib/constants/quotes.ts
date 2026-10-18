export interface MotivationalQuote {
  quote: string;
  author: string;
}

export const CURATED_DAILY_QUOTES: MotivationalQuote[] = [
  { quote: "Education is the passport to the future, for tomorrow belongs to those who prepare for it today.", author: "Malcolm X" },
  { quote: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
  { quote: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
  { quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { quote: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { quote: "Develop a passion for learning. If you do, you will never cease to grow.", author: "Anthony J. D'Angelo" },
  { quote: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { quote: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { quote: "Small disciplines repeated with consistency every day lead to great achievements.", author: "John C. Maxwell" },
  { quote: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { quote: "The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice.", author: "Brian Herbert" },
  { quote: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { quote: "The mind is not a vessel to be filled, but a fire to be kindled.", author: "Plutarch" },
  { quote: "There are no shortcuts to any place worth going.", author: "Beverly Sills" },
  { quote: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { quote: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { quote: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { quote: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { quote: "Don't let what you cannot do interfere with what you can do.", author: "John Wooden" },
  { quote: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { quote: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { quote: "You are capable of more than you know. Prepare to be amazed by what you can accomplish.", author: "Bill Watterson" },
  { quote: "Curiosity is the wick in the candle of learning.", author: "William Arthur Ward" },
  { quote: "Consistency is what transforms average into excellence.", author: "Tony Robbins" },
  { quote: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { quote: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { quote: "Hard work beats talent when talent fails to work hard.", author: "Tim Notke" },
  { quote: "Energy and persistence conquer all things.", author: "Benjamin Franklin" },
  { quote: "Continuous effort—not strength or intelligence—is the key to unlocking potential.", author: "Liane Cardes" },
  { quote: "Great things are done by a series of small things brought together.", author: "Vincent van Gogh" },
  { quote: "Study hard: what you master today becomes your superpower tomorrow.", author: "Unknown" }
];

export function getCuratedDailyQuote(dateStr?: string): MotivationalQuote {
  const d = dateStr ? new Date(dateStr) : new Date();
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 0));
  const diff = d.getTime() - yearStart.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const index = Math.abs(dayOfYear) % CURATED_DAILY_QUOTES.length;
  return CURATED_DAILY_QUOTES[index];
}
