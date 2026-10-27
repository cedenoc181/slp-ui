import { useAuth } from '../../../context/AuthContext';
import ProductOverview, { MockRow } from './ProductOverview';
import trophyIcon from '../../../assets/icons/trophy.png';
import targetIcon from '../../../assets/icons/target.png';
import analysisIcon from '../../../assets/icons/analysis.png';
import sabermetricIcon from '../../../assets/icons/sabermetric.png';
import predictiveIcon from '../../../assets/icons/predictive-analytics.png';

function TrustLedgerLanding() {
  const { isAuthenticated, isPremium } = useAuth();

  return (
    <ProductOverview
      eyebrow="Sandlotpicks Trust Ledger"
      title="Receipts, not promises."
      titleAccent="Every pick, graded on the record."
      sub="Every pick we've ever published, graded after the fact and left on the record — wins and losses both. It's the one page that keeps us honest, and it's why you don't have to take our word for it."
      primary={{ label: 'View the Full Ledger', path: '/predictions/trust-ledger' }}
      methods={[
        { icon: targetIcon,    title: 'Auto-Graded',      sub: 'Every pick settled the moment the game ends' },
        { icon: analysisIcon,  title: 'Trust Scores',     sub: 'Rolling reliability by team and market' },
        { icon: trophyIcon,    title: 'Full History',     sub: 'Wins and losses — nothing deleted' },
      ]}
      features={[
        {
          accent: 'green',
          tag: 'Graded Record',
          tagIcon: targetIcon,
          title: 'Graded, not curated',
          description: 'Every published pick lands on the ledger automatically once the game ends. There is no editing the record after the fact, and no quietly dropping the bad nights.',
          bullets: [
            'Every published pick is graded win, loss, or push after the final out',
            'Losses stay on the ledger right next to the wins',
            'Pick-by-pick history with the line and odds at publish time',
          ],
          mockTitle: 'Recent grades',
          mockUrl: 'sandlotpicks.com/trust-ledger',
          mock: (
            <>
              <MockRow left="LAD ML" sub="-135" right="W" tone="pos" />
              <MockRow left="Over 8.5" sub="NYY @ BOS" right="L" tone="neg" />
              <MockRow left="Skubal o7.5 K" sub="-110" right="W" tone="pos" />
              <MockRow left="HOU -1.5" sub="+125" right="W" tone="pos" />
            </>
          ),
        },
        {
          accent: 'blue',
          tag: 'Trust Scores',
          tagIcon: sabermetricIcon,
          title: 'Scored for reliability, not one hot streak',
          description: 'Each team and market gets a rolling trust score built from real accuracy over time, so you can see where the model has earned your confidence — and where it hasn\'t.',
          bullets: [
            'Rolling trust score per team, built from graded results',
            'Accuracy split by market: moneyline, totals, and props',
            'Spot the markets the model handles best before you bet',
          ],
          mockTitle: 'Top trust scores',
          mockUrl: 'sandlotpicks.com/trust-ledger',
          mock: (
            <>
              <MockRow left="1  LAD" right="92" tone="pos" />
              <MockRow left="2  HOU" right="88" tone="pos" />
              <MockRow left="3  ATL" right="85" tone="pos" />
              <MockRow left="4  PHI" right="81" />
            </>
          ),
        },
        {
          accent: 'yellow',
          tag: 'Live Updates',
          tagIcon: predictiveIcon,
          title: 'Updated after every game',
          description: 'Scores refresh the moment results are final, so the ledger always reflects the most recent form instead of last month\'s numbers.',
          bullets: [
            'Results settle automatically as games go final',
            'Trust scores recalculate with every graded pick',
            'Free accounts get a preview — Premium unlocks the full ledger',
          ],
          mockTitle: 'Season record',
          mockUrl: 'sandlotpicks.com/trust-ledger',
          mock: (
            <>
              <MockRow left="Moneyline" sub="win rate" right="58.4%" tone="pos" />
              <MockRow left="Totals" sub="win rate" right="55.1%" tone="pos" />
              <MockRow left="Pitcher props" sub="win rate" right="56.9%" tone="pos" />
              <MockRow left="Last updated" right="Final · 11:42 PM" />
            </>
          ),
        },
      ]}
      howTitle="How the ledger works"
      steps={[
        { title: 'Pick is published', text: 'Every pick is locked in with its line and odds the moment it goes live — no edits after publishing.' },
        { title: 'Game goes final',   text: 'Once the final out is recorded, the pick is graded automatically against the official result.' },
        { title: 'Record is updated', text: 'The graded pick joins the permanent history, wins and losses side by side.' },
        { title: 'Trust score moves', text: 'Rolling trust scores recalculate for that team and market, so reliability always reflects recent form.' },
      ]}
      cta={!isPremium && {
        eyebrow: 'Premium Access',
        title: 'See the full track record for yourself.',
        sub: 'Free accounts see a preview of the Trust Ledger. Premium unlocks the complete graded history, every trust score, and accuracy by market.',
        perks: ['Full graded pick history', 'Trust scores for every team', 'Accuracy by market', 'Updated after every game'],
        label: isAuthenticated ? 'Upgrade to Premium' : 'Get Started',
        path: isAuthenticated ? '/upgrade' : '/account',
      }}
    />
  );
}

export default TrustLedgerLanding;
