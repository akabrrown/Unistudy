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
  { quote: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { quote: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { quote: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { quote: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { quote: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { quote: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { quote: "Consistency is what transforms average into excellence.", author: "Tony Robbins" },
  { quote: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { quote: "Hard work beats talent when talent fails to work hard.", author: "Tim Notke" },
  { quote: "Great things are done by a series of small things brought together.", author: "Vincent van Gogh" },
];

export function getCuratedDailyQuote(dateStr?: string): MotivationalQuote {
  const d = dateStr ? new Date(dateStr) : new Date();
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 0));
  const diff = d.getTime() - yearStart.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const index = Math.abs(dayOfYear) % CURATED_DAILY_QUOTES.length;
  return CURATED_DAILY_QUOTES[index];
}

