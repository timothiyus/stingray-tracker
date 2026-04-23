# Stingray Tracker 🏎️

A gamified savings tracker built with pure HTML, CSS, and JavaScript. Track your spending and watch your dream of owning a 1960s-70s Corvette Stingray come to life with every dollar saved.

## Features

- **Journey Milestones**: Visual progress tracking from $0 to $20,000 with achievement emojis at each milestone
- **Daily Spending Log**: Track expenses by category (Food, Entertainment, Shopping, Transport, Health, Subscriptions, Other)
- **Subscription Manager**: Monitor recurring costs and their impact on your daily budget
- **Statistics Dashboard**: 
  - Current and longest streaks for staying under budget
  - Weekly performance tracking
  - Monthly savings analysis
  - Budget breakdown and projections
- **Achievements**: Unlock 7 different badges by reaching milestones and maintaining streaks
- **Data Persistence**: All data is saved locally using localStorage—no backend required
- **Responsive Design**: Dark theme interface that works on desktop and mobile devices

## How It Works

1. Set your monthly "fun money" budget (default: $400)
2. Log daily expenses as you spend
3. Watch your savings accumulate toward your $20,000 Stingray dream
4. Maintain daily streaks by staying under your daily allowance
5. Unlock achievements as you reach savings milestones

## Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- No installation or build process required

### Running Locally

#### Option 1: Python HTTP Server
```bash
cd stingray-tracker
python -m http.server 8000
```
Then visit `http://localhost:8000` in your browser.

#### Option 2: Node.js HTTP Server
```bash
npm install -g http-server
cd stingray-tracker
http-server
```

#### Option 3: Direct File Opening
Simply open `index.html` in your web browser (some features may be limited due to browser security restrictions with localStorage).

## Project Structure

```
stingray-tracker/
├── index.html       # Main HTML structure
├── css/
│   └── style.css    # Complete styling (dark theme, responsive)
├── js/
│   └── app.js       # Application logic and state management
└── README.md        # This file
```

## Technology Stack

- **HTML5**: Semantic markup with proper form structure
- **CSS3**: Flexbox and CSS Grid for responsive layouts
- **Vanilla JavaScript**: No frameworks or dependencies
- **localStorage API**: Client-side data persistence

## Configuration

Edit the `CONFIG` object in `js/app.js` to customize:

```javascript
const CONFIG = {
  monthlyFunMoney: 400,           // Your monthly budget
  targetMonthlySavings: 225,      // Target monthly savings
  targetSavingsGoal: 20000,       // Total savings goal
  startDate: '2026-05-01',        // Program start date
};
```

## Data Storage

All data is stored in the browser's localStorage under the key `stingrayData`. Data includes:
- Daily transactions with timestamps and categories
- Active subscriptions and billing dates
- Configuration and progress tracking

To clear all data (in browser console):
```javascript
localStorage.removeItem('stingrayData');
location.reload();
```

## Deployment

### GitHub Pages
1. Create a GitHub repository
2. Push this code to the `main` branch
3. Enable GitHub Pages in repository settings (source: `main` branch, root directory)
4. Your tracker will be live at `https://yourusername.github.io/stingray-tracker/`

### Other Hosting
Deploy to any static hosting service:
- Vercel
- Netlify
- AWS S3 + CloudFront
- Azure Static Web Apps
- Any web server (Apache, Nginx, etc.)

## Features Breakdown

### Calculations
- **Daily Allowance**: `(Monthly Budget - Subscriptions) / 30`
- **Total Saved**: `(Monthly Budget × Months Elapsed) - Total Spent`
- **Streaks**: Consecutive days spent under daily allowance
- **Projections**: Estimated purchase date based on savings rate

### Achievements
- 👣 First Step: Log your first transaction
- 🔥 5-Day Streak: Stay under budget for 5 consecutive days
- ✨ Perfect Week: Stay under budget all 7 days
- 🎯 Monthly Goal: Reach your monthly savings target
- 💎 $5K Saved: Reach $5,000 milestone
- 💰 $10K Saved: Reach $10,000 milestone
- 🏆 $20K Saved: Reach your dream goal

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

localStorage is required for data persistence.

## Tips for Success

1. **Set realistic budgets**: Your daily allowance is calculated automatically
2. **Track everything**: Log all spending for accurate projections
3. **Manage subscriptions**: Review and remove unused subscriptions
4. **Maintain streaks**: Small daily habits lead to big savings
5. **Check reports**: Review spending patterns monthly to optimize

## Future Enhancements

Potential features for future versions:
- Export data to CSV/JSON
- Multi-currency support
- Budget alerts and notifications
- Custom milestone goals
- Social sharing of milestones
- Cloud backup and sync

## License

This project is open source and available for personal use.

## Dream Big! 🏎️

Every dollar saved is one step closer to your Stingray. Keep tracking, stay disciplined, and watch your dream become reality!
