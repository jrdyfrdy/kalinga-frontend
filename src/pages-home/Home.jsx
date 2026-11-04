import PublicLayout from "@/layouts/PublicLayout";
import { AboutSection } from "../components/home/AboutSection";
import { HeroSection } from "../components/home/HeroSection";
import { MissionSection } from "../components/home/MissionSection";
import { ContactSection } from "../components/home/Contact";

export const Home = () => (
  <PublicLayout>
    <HeroSection />
    <AboutSection />
    <MissionSection />
    <ContactSection />
  </PublicLayout>
);
