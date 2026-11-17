import { useAuth } from '../../../context/AuthContext';
import ProductOverview from './ProductOverview';
import trophyIcon from '../../../assets/icons/trophy.png';
import targetIcon from '../../../assets/icons/target.png';
import analysisIcon from '../../../assets/icons/analysis.png';
import sabermetricIcon from '../../../assets/icons/sabermetric.png';
import rankingsImg from '../../../assets/images/trust-ledger-rankings.png';
import splitsImg from '../../../assets/images/trust-ledger-splits.png';

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
          tag: 'Trust Score',
          tagIcon: targetIcon,
          title: 'Every team, ranked by how much you can trust them',
          description: 'Each team\'s trust score blends 70% season W-L% with 30% last-10-game form, then ranks it into a league-wide percentile — so a hot streak counts, but it can\'t erase a whole season. The trust meter shows exactly where a club sits against all 30 teams, right next to MLB\'s own offense and pitching rank so you can see whether the record matches the roster.',
          bullets: [
            'Trust score: 70% season W-L%, 30% last-10-game form',
            'Ranked as a percentile against the full league — even in the postseason',
            'MLB offense and pitching rank side by side for every club',
            'Season W-L% and last-10 record in their own columns',
            'Switch between Regular Season and Postseason views',
            'Click any column to re-sort all 30 teams',
          ],
          mockUrl: 'sandlotpicks.com/trust-ledger',
          image: rankingsImg,
          imageAlt: 'Trust Ledger rankings table with trust score, MLB rank, playoff and last-10 columns',
        },
        {
          accent: 'blue',
          tag: 'Matchup Form',
          tagIcon: sabermetricIcon,
          title: 'Expand any team for the splits that matter',
          description: 'The ledger is built around today\'s game, not last month\'s. Every row carries the actual starter on the mound tonight and how the top of the lineup has been hitting, and one click opens the full-season record splits — home and road, against lefties and righties, and both combined.',
          bullets: [
            'Today\'s starter with his form over the last 5 starts',
            'Top-6 lineup OPS over the last 5 games',
            'Bullpen availability heading into today\'s game',
            'Home and road win rates, plus vs LHP and vs RHP',
            'Combined splits: vs LHP and RHP at home and on the road',
            'Green and red tags flag strong or concerning recent form',
          ],
          mockUrl: 'sandlotpicks.com/trust-ledger',
          image: splitsImg,
          imageAlt: 'Trust Ledger row expanded to show home/away and vs LHP/RHP record splits',
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
