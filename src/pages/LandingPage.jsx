import { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { AuthContext, ThemeContext } from "../App";
import { isUsingRealAPI } from "../services/apiService";
import { GlitchText, GradientText, TypewriterText, HighlightWord } from "../lib/animations";
import { 
  CheckSquare, 
  Brain, 
  Users, 
  Gift, 
  Calendar, 
  Sparkles,
  ArrowRight,
  Moon,
  Sun
} from "lucide-react";

export default function LandingPage() {
  const { user } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const features = [
    {
      icon: <CheckSquare className="w-6 h-6" />,
      title: "Task Tracking",
      description: "Daily checkboxes with streak tracking and calendar view"
    },
    {
      icon: <Brain className="w-6 h-6" />,
      title: "AI Study Tools",
      description: "Generate quizzes, flashcards, and summaries with AI"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Community",
      description: "Discord-style servers with real-time messaging"
    },
    {
      icon: <Gift className="w-6 h-6" />,
      title: "Gift Exchange",
      description: "Create wishlists and organize gift exchanges"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-heading font-semibold text-lg">TaskFlow</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              data-testid="theme-toggle"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            
            {(user || !isUsingRealAPI()) ? (
              <Button onClick={() => navigate("/dashboard")} data-testid="go-to-dashboard">
                Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={() => navigate("/auth")} data-testid="get-started-btn">
                Get Started <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* 1. Hero headline — glitch on hover + animated gradient accent */}
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-6">
              {/* Hover to see the RGB-split glitch */}
              <GlitchText>Your all-in-one</GlitchText>
              {/* Gradient shifts automatically, no interaction needed */}
              <GradientText as="span" className="block mt-1">
                productivity hub
              </GradientText>
            </h1>

            {/* 2. Subheading — typewriter, starts 300 ms after mount */}
            <p className="text-lg text-muted-foreground mb-8 max-w-lg min-h-[3.5rem]">
              <TypewriterText
                text="Track tasks with streaks, study with AI-powered tools, connect in communities, and share wishlists — all in one beautiful workspace."
                speed={28}
                delay={300}
              />
            </p>
            <div className="flex flex-wrap gap-4">
              <Button 
                size="lg" 
                onClick={() => navigate(user ? "/dashboard" : "/auth")}
                data-testid="hero-cta"
                className="rounded-full px-8"
              >
                Start for free <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="rounded-full px-8"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Learn more
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative"
          >
            <div className="aspect-square rounded-3xl overflow-hidden shadow-medium">
              <img 
                src="https://images.unsplash.com/photo-1721383168321-a013f8ae890f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzl8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwc3R1ZHklMjBkZXNrJTIwcGxhbnRzfGVufDB8fHx8MTc2NTQ5ODQyN3ww&ixlib=rb-4.1.0&q=85"
                alt="Productive workspace"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-card rounded-2xl p-4 shadow-medium border border-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium">12 day streak</p>
                  <p className="text-sm text-muted-foreground">Keep it going!</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            {/* 3. Features heading — highlight reveals "stay productive" on scroll */}
            <h2 className="font-heading text-3xl md:text-4xl font-medium mb-4">
              Everything you need to{' '}
              <HighlightWord>stay productive</HighlightWord>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Combine task management, AI-powered learning, community features, and gift exchanges
              in one seamless experience.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-card rounded-2xl p-6 border border-border hover:shadow-medium transition-all duration-200 hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-heading font-medium text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            {/* 4. CTA heading — gradient on the action phrase + highlight on "boost" */}
            <h2 className="font-heading text-3xl md:text-4xl font-medium mb-4">
              Ready to{' '}
              <HighlightWord delay={200}>
                <GradientText as="span">boost your productivity</GradientText>
              </HighlightWord>
              ?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Join thousands of users who have transformed their daily routines with TaskFlow.
            </p>
            <Button 
              size="lg" 
              onClick={() => navigate(user ? "/dashboard" : "/auth")}
              className="rounded-full px-10"
              data-testid="cta-btn"
            >
              Get started now <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-heading font-medium">TaskFlow</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 TaskFlow. Built with care.
          </p>
        </div>
      </footer>
    </div>
  );
}
