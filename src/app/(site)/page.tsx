import { AntigoneReveal } from '@/components/home/antigone-reveal';
import { HomeHeaderReveal } from '@/components/home/home-header-reveal';
import { WomenOnLine } from '@/components/home/women-on-line';

export default function HomePage() {
  return (
    <div className="home">
      <HomeHeaderReveal />
      <WomenOnLine />
      <AntigoneReveal />
    </div>
  );
}
