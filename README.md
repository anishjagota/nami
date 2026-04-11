# Nami — Portfolio Construction & Simulation Lab

A web application for everyday investors to build hypothetical portfolios, compare them against benchmarks and optimized alternatives, explore historical performance, and simulate future outcomes.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## Features

### 1. Build Portfolio
- Select from **~50 curated ETFs** across 10 asset categories
- **Search** to quickly find ETFs by ticker or name
- Assign weights with sliders and numeric inputs
- Real-time validation (weights must sum to 100%)
- Quick-start presets: Balanced, Growth, Conservative, All Weather

### 2. Compare Options
- Side-by-side comparison with 4 alternatives:
  - **Benchmark**: 50/50 Stock-Bond
  - **Safer Version**: Minimum Variance optimization
  - **Balanced Version**: Risk Parity optimization
  - **Efficiency-Focused**: Maximum Sharpe Ratio
- Metrics: Expected return, volatility, Sharpe ratio
- Visual allocation bars and expandable methodology explanations

### 3. Historical Explorer
- Growth-of-$1 chart with multiple portfolios
- Date range selection: 1Y, 3Y, 5Y, 10Y, MAX
- Toggle individual portfolios on/off
- Drawdown analysis with peak/trough dates
- Performance metrics: Total return, annualized return, volatility, max drawdown

### 4. Future Simulation
- Monte Carlo simulation with 10,000 paths
- Adjustable parameters:
  - Time horizon: 5-30 years
  - Initial capital: $10k - $1M
  - Monthly contributions: $0 - $5k
- Fan chart showing percentile bands (5th, 25th, 50th, 75th, 95th)
- Terminal wealth histogram
- Probability insights: chance of profit, doubling, loss

## Expanded ETF Universe (~50 ETFs)

| Category | ETFs |
|----------|------|
| **US Stocks — Broad** | SPY, VOO, VTI, IVV |
| **US Stocks — Size** | QQQ, IWM, IJH, IJR |
| **US Stocks — Style** | VTV, VUG, MTUM, USMV |
| **US Stocks — Sectors** | XLK, XLF, XLV, XLE, XLU, XLI |
| **International** | VEA, VWO, IEFA, EEM, VXUS, EFA |
| **Government Bonds** | SHY, IEF, TLT, TIP, GOVT, VGSH |
| **Corporate Bonds** | LQD, HYG, VCIT, VCSH |
| **Broad Bonds** | AGG, BND, BNDX |
| **Real Estate** | VNQ, VNQI, IYR |
| **Commodities** | GLD, IAU, SLV, DBC, GSG |

## Data Modes

### Offline Mode (Default)
Works immediately with 7 core ETFs (SPY, AGG, VEA, VWO, GLD, VNQ, DBC) using bundled historical data. No API key required.

### Online Mode (Optional)
Enable real-time data for all ~50 ETFs:

1. Get a free API key from [Financial Modeling Prep](https://financialmodelingprep.com/developer) (250 requests/day free)
2. Create a `.env` file in the project root:
   ```
   VITE_FMP_API_KEY=your_api_key_here
   ```
3. Restart the dev server

Data is cached locally (IndexedDB) for 24 hours to minimize API calls.

## Project Structure

```
nami/
├── src/
│   ├── calc/             # Calculation modules
│   │   ├── statistics.js    # Mean, covariance, correlation
│   │   ├── optimizer.js     # MinVar, RiskParity, MaxSharpe
│   │   ├── metrics.js       # Portfolio metrics
│   │   ├── backtest.js      # Historical backtesting
│   │   ├── monteCarlo.js    # Monte Carlo simulation
│   │   └── use*.js          # React hooks
│   │
│   ├── components/       # UI components
│   │   ├── Layout.jsx, Navigation.jsx
│   │   ├── AssetSelector.jsx (with search)
│   │   ├── WeightEditor.jsx
│   │   ├── ComparisonCard.jsx
│   │   ├── GrowthChart.jsx
│   │   └── MonteCarloCharts.jsx
│   │
│   ├── pages/            # Main app pages
│   │   ├── BuildPortfolio.jsx
│   │   ├── CompareOptions.jsx
│   │   ├── HistoricalExplorer.jsx
│   │   └── FutureSimulation.jsx
│   │
│   ├── data/
│   │   ├── universe/        # Curated ETF definitions
│   │   ├── providers/       # API + mock data providers
│   │   ├── services/        # Data orchestration
│   │   ├── cache/           # IndexedDB caching
│   │   └── transforms/      # Price-to-returns conversion
│   │
│   ├── context/          # Portfolio state management
│   └── config/           # Constants & API config
```

## Configuration

Key settings in `src/config/constants.js`:
- **Risk-free rate**: 3% annually
- **Monte Carlo simulations**: 10,000 paths
- **Historical data**: Jan 2007 – Dec 2024 (216 months)
- **Rebalancing**: Monthly (for backtests)

## Tech Stack

- React 18 + Vite
- Tailwind CSS
- Recharts
- React Router
- Lucide React icons

## Optimization Algorithms

All optimizations use only the user's selected assets:

- **Minimum Variance**: Minimizes `w'Σw` via Lagrangian + projected gradient
- **Risk Parity**: Equalizes risk contributions via gradient descent
- **Maximum Sharpe**: Grid search over efficient frontier for max `(μ'w - rf) / σ`

---

Built with Nami 🌊 | Educational purposes only, not financial advice.
