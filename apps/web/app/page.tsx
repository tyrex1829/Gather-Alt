import { Navbar } from "../components/landing/navbar";
import { Hero } from "../components/landing/hero";
import { SocialProof } from "../components/landing/social-proof";
import { Features } from "../components/landing/features";
import { HowItWorks } from "../components/landing/how-it-works";
import { Showcase } from "../components/landing/showcase";
import { CTASection } from "../components/landing/cta-section";
import { Footer } from "../components/landing/footer";

export default function Page() {
  return (
    <main className="min-h-screen text-white">
      <Navbar />
      <Hero />
      <SocialProof />
      <Features />
      <HowItWorks />
      <Showcase />
      <CTASection />
      <Footer />
    </main>
  );
}
