import '../styles/landing.css';
import { LandingNav } from '../components/landing/LandingNav';
import { Hero } from '../components/landing/Hero';
import { Features } from '../components/landing/Features';
import { Categories } from '../components/landing/Categories';
import { Steps } from '../components/landing/Steps';
import { IssuePanel } from '../components/landing/IssuePanel';
import { ScanTiers } from '../components/landing/ScanTiers';
import { LandingCTA } from '../components/landing/LandingCTA';
import { LandingFooter } from '../components/landing/LandingFooter';
import { useScanSubmit } from '../components/landing/useScanSubmit';
import { useLandingEffects } from '../components/landing/useLandingEffects';

export function LandingPage() {
  const { url, setUrl, handleScan, user } = useScanSubmit();
  useLandingEffects();

  return (
    <div className="landing-page">
      <LandingNav user={!!user} />
      <Hero url={url} setUrl={setUrl} onSubmit={handleScan} />
      <Features />
      <Categories />
      <Steps />
      <IssuePanel />
      <ScanTiers />
      <LandingCTA url={url} setUrl={setUrl} onSubmit={handleScan} user={!!user} />
      <LandingFooter />
    </div>
  );
}
