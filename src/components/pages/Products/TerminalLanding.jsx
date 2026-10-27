import { useAuth } from '../../../context/AuthContext';
import ProductOverview, { MockRow } from './ProductOverview';
import commandIcon from '../../../assets/icons/command-centre.png';
import standingsIcon from '../../../assets/icons/mlb-standings.png';
import stadiumIcon from '../../../assets/icons/baseball-stadium.png';
import aiMlIcon from '../../../assets/icons/ai-ml.png';
import scheduleIcon from '../../../assets/icons/mlb-schedule.png';

function TerminalLanding() {
  const { isAuthenticated, isPremium } = useAuth();

  return (
    <ProductOverview
      eyebrow="Sandlotpicks Terminal"
      title="Every stat, pick, and trend."
      titleAccent="One terminal, no ten tabs."
      sub="The Terminal is the home screen for your Sandlot Picks account — live scores, standings, your watchlist, the Trust Ledger, and today's predictions, all in one scannable view."
      primary={isAuthenticated
        ? { label: 'Open Your Terminal', path: '/terminal' }
        : { label: 'Start Free', path: '/account' }}
      methods={[
        { icon: commandIcon,   title: 'One Screen',    sub: 'Every panel on a single dashboard' },
        { icon: stadiumIcon,   title: 'Live by Default', sub: 'Scores and grades update through the day' },
        { icon: aiMlIcon,      title: 'Picks Built In', sub: 'Today\'s predictions next to the data' },
      ]}
      features={[
        {
          accent: 'blue',
          tag: 'Built to Scan',
          tagIcon: commandIcon,
          title: 'Built to scan, not scroll',
          description: 'Dense, dark panels keep every number on screen at once — the way you\'d want a desk to look, not a feed you have to dig through.',
          bullets: [
            'Live scores, standings, watchlist, and ledger side by side',
            'Compact panels designed for a quick read before first pitch',
            'Jump from any panel straight into the full page',
          ],
          mockTitle: 'Live scores',
          mockUrl: 'sandlotpicks.com/terminal',
          mock: (
            <>
              <MockRow left="NYY 4 · BOS 2" sub="T7" right="LIVE" tone="pos" />
              <MockRow left="LAD 6 · SF 3" sub="F" right="Final" />
              <MockRow left="HOU · SEA" sub="10:10 PM" right="Pre" />
            </>
          ),
        },
        {
          accent: 'green',
          tag: 'Live by Default',
          tagIcon: standingsIcon,
          title: 'Numbers that stay current',
          description: 'Scores, standings, and ledger grades update through the day, so you never have to refresh or wonder whether a number is stale.',
          bullets: [
            'Standings move as games go final',
            'Trust Ledger grades post right after the final out',
            'Your watchlist follows the teams you care about',
          ],
          mockTitle: 'AL East standings',
          mockUrl: 'sandlotpicks.com/terminal',
          mock: (
            <>
              <MockRow left="NYY" sub="94-62" right="—" />
              <MockRow left="BAL" sub="90-66" right="4.0 GB" />
              <MockRow left="BOS" sub="84-72" right="10.0 GB" />
              <MockRow left="TOR" sub="79-77" right="15.0 GB" />
            </>
          ),
        },
        {
          accent: 'purple',
          tag: 'Free vs. Premium',
          tagIcon: scheduleIcon,
          title: 'Free to start, Premium to go all-in',
          description: 'Every account gets the Terminal. Free accounts see standings, scores, and ledger previews; Premium unlocks the full predictions panel and every prop market behind it.',
          bullets: [
            'Free: live scores, standings, and a Trust Ledger preview',
            'Premium: today\'s full predictions panel',
            'Premium: game, pitcher, and batter props in one place',
          ],
          mockTitle: 'Today\'s predictions',
          mockUrl: 'sandlotpicks.com/terminal',
          mock: (
            <>
              <MockRow left="SEA ML" sub="65% win prob" right="●●●●○" tone="pos" />
              <MockRow left="Over 7.5" sub="71% win prob" right="●●●●●" tone="pos" />
              <MockRow left="Gilbert u6.5 K" sub="62% win prob" right="●●●○○" tone="pos" />
            </>
          ),
        },
      ]}
      howTitle="How to use the terminal"
      steps={[
        { title: 'Create an account', text: 'Sign up free — no card required. Your Terminal is live the moment you sign up.' },
        { title: 'Browse free panels', text: 'Live scores, standings, and a Trust Ledger preview are open on every free plan.' },
        { title: 'Build a watchlist',  text: 'Follow the teams you bet on most so their games and numbers stay front and center.' },
        { title: 'Unlock Premium',     text: 'Upgrade to open today\'s full predictions panel and every prop market behind it.' },
      ]}
      cta={!isPremium && {
        eyebrow: isAuthenticated ? 'Premium Access' : 'Free Account',
        title: 'Your Terminal is one account away.',
        sub: 'Start with live scores, standings, and ledger previews for free — then unlock full predictions and props with Premium.',
        perks: ['Live scores & standings', 'Team watchlist', 'Trust Ledger preview', 'Premium predictions panel'],
        label: isAuthenticated ? 'Upgrade to Premium' : 'Start Free',
        path: isAuthenticated ? '/upgrade' : '/account',
      }}
    />
  );
}

export default TerminalLanding;
