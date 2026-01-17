const motivationalPhrases = [
  "The best time to plant a tree was 20 years ago. The second best time is now",
  "You don't have to be great to start, but you have to start to be great",
  "Focus on the possibilities for success, not on the potential for failure",
  "The only way to do great work is to love what you do",
  "Do not wait to strike till the iron is hot; but make it hot by striking",
  "Concentration is the secret of strength",
  "The future depends on what you do today",
  "It does not matter how slowly you go as long as you do not stop",
  "Your time is limited, don't waste it living someone else's life",
  "Discipline is choosing between what you want now and what you want most",
  "The way to get started is to quit talking and begin doing",
  "Focus on being productive instead of busy",
  "What you do today can improve all your tomorrows",
  "A year from now you may wish you had started today",
  "Don't watch the clock; do what it does. Keep going",
  "Success is the sum of small efforts repeated day in and day out",
  "Don't dwell on what went wrong. Instead, focus on what to do next. Spend your energies on moving forward toward finding the answer",
  "Concentrate all your thoughts upon the work at hand. The sun's rays do not burn until brought to a focus",
  "The successful warrior is the average man, with laser-like focus",
  "You can't do big things if you're distracted by small things",
  "It's not whether you get knocked down, it's whether you get back up.",
  "Our greatest weakness lies in giving up. The most certain way to succeed is always to try just one more time.",
  "The mind is like water. When it's turbulent, it's difficult to see. When it's calm, everything becomes clear."
];

export function getRandomPhrase(): string {
  const randomIndex = Math.floor(Math.random() * motivationalPhrases.length);
  return motivationalPhrases[randomIndex];
}

export function showNotification(): void {
  const text = getRandomPhrase();
  console.log('showNotification called with text:', text);

  if ('Notification' in window) {
    console.log('Notification API available, permission:', Notification.permission);
    if (Notification.permission === 'granted') {
      console.log('Permission granted, creating notification');
      const notification = new Notification(text);
      console.log('Notification created:', notification);
    } else if (Notification.permission !== 'denied') {
      console.log('Requesting notification permission');
      Notification.requestPermission().then((permission) => {
        console.log('Permission response:', permission);
        if (permission === 'granted') {
          console.log('Permission granted after request, creating notification');
          const notification = new Notification(text);
          console.log('Notification created after permission:', notification);
        }
      });
    } else {
      console.log('Notification permission denied');
    }
  } else {
    console.log('Notification API not available');
  }
}
