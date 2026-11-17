import { useAuth } from '../../../context/AuthContext';
import ProductOverview, { MockRow } from './ProductOverview';
import profitLossIcon from '../../../assets/icons/profit-and-loss.png';
import analysisIcon from '../../../assets/icons/analysis.png';
import strategyIcon from '../../../assets/icons/strategy-blog.png';
import targetIcon from '../../../assets/icons/target.png';
import trackerImg from '../../../assets/images/bet-library-tracker.png';
import detailImg from '../../../assets/images/bet-library-detail.png';

// Screenshots and mock rows are illustrative — a visitor's own Bet Library is
// empty until they sign up and log bets.
function BetLibraryLanding() {
  const { isAuthenticated } = useAuth();

  return (
    <ProductOverview
      eyebrow="Sandlotpicks Bet Library"
      title="Your own P&L, tracked."
      titleAccent="Every bet, no spreadsheet."
      sub="Log the bets you actually make and let the Library do the math — odds, units, and ROI tracked automatically, so you always know where you stand."
      primary={{
        label: isAuthenticated ? 'Open Bet Library' : 'Create a Free Account',
        path: isAuthenticated ? '/predictions/bet-library' : '/account',
      }}
      methods={[
        { icon: profitLossIcon, title: 'Unit P&L',       sub: 'Running profit and loss in flat units' },
        { icon: analysisIcon,   title: 'ROI by Market',  sub: 'Moneylines, totals, and props split out' },
        { icon: strategyIcon,   title: 'Your Own Log',   sub: 'What you took — not what we published' },
      ]}
      features={[
        {
          accent: 'yellow',
          tag: 'Unit P&L',
          tagIcon: profitLossIcon,
          title: 'Log a bet once, the math is done',
          description: 'Enter the pick and the odds, and the Library tracks your running profit and loss in units the moment the result is in — no manual tallying.',
          bullets: [
            'Flat-unit P&L that updates as your bets settle',
            'American odds converted to payouts automatically',
            'Running balance so you always know where you stand',
            'Net units, ROI, record, win rate, and pending bets up top',
            'Filter by taken or watchlist, and by won, lost, push, or pending',
          ],
          mockUrl: 'sandlotpicks.com/bet-library',
          image: trackerImg,
          imageAlt: 'Bet Library P&L tracker with net units, ROI, record, win rate and pending cards above a list of taken bets',
        },
        {
          accent: 'blue',
          tag: 'Win Rate & ROI',
          tagIcon: analysisIcon,
          title: 'See how you actually do, market by market',
          description: 'Your record is broken out by bet type, so you can tell whether you\'re sharp on totals and leaking on props — not just a single aggregate number.',
          bullets: [
            'Win rate and ROI for moneylines, run lines, totals, and props',
            'Spot your strongest and weakest markets at a glance',
            'Separate your gut plays from model-backed picks',
          ],
          mockTitle: 'ROI by market',
          mockUrl: 'sandlotpicks.com/bet-library',
          mock: (
            <>
              <MockRow left="Moneyline" sub="24 bets" right="+6.1%" tone="pos" />
              <MockRow left="Totals" sub="18 bets" right="+3.4%" tone="pos" />
              <MockRow left="Props" sub="31 bets" right="-2.7%" tone="neg" />
            </>
          ),
        },
        {
          accent: 'green',
          tag: 'Your Own Log',
          tagIcon: targetIcon,
          title: 'One place for every bet you make',
          description: 'The Bet Library is your personal record, kept separate from our published picks — a log of what you took, not what we recommended.',
          bullets: [
            'Free with every account — no card required',
            'Private to you, separate from the Trust Ledger',
            'Every bet in one place instead of scattered across books',
            'Odds, model probability, EV, and the Scout AI prompt saved at pick time',
            'Tracked and settled timestamps on every bet',
          ],
          mockUrl: 'sandlotpicks.com/bet-library',
          image: detailImg,
          imageAlt: 'An expanded Bet Library entry showing tracked and settled times, the Scout AI prompt, and settle buttons',
        },
      ]}
      howTitle="How the library works"
      steps={[
        { title: 'Create an account', text: 'Your Bet Library is created the moment you sign up — free, no card required.' },
        { title: 'Log your bet',      text: 'Add the pick, the odds, and your stake in units. That\'s all the Library needs.' },
        { title: 'Results settle',    text: 'Once the game is final, the bet is graded and your P&L updates automatically.' },
        { title: 'Review your edge',  text: 'Check win rate and ROI by market to see where you\'re winning and where you\'re leaking.' },
      ]}
      cta={!isAuthenticated && {
        eyebrow: 'Free Account',
        title: 'Start your own log today.',
        sub: 'Every free account gets the full Bet Library — unit P&L, win rate, and ROI by market, tracked automatically.',
        perks: ['Flat-unit P&L tracking', 'Win rate & ROI by market', 'Every bet in one place', 'No card required'],
        label: 'Create a Free Account',
        path: '/account',
      }}
    />
  );
}

export default BetLibraryLanding;
