import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { CheckCircle2, Crown, ArrowRight } from "lucide-react";

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Small delay so the animation feels deliberate
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={visible ? { opacity: 1, scale: 1, y: 0 } : {}}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-md w-full text-center"
      >
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={visible ? { scale: 1 } : {}}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="flex justify-center mb-6"
        >
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-xl">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
        </motion.div>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={visible ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.35 }}
        >
          <h1 className="text-3xl font-bold mb-2">You&apos;re a Founder! 🎉</h1>
          <p className="text-muted-foreground text-lg mb-2">
            Your Founder Pass purchase was successful.
          </p>
          <p className="text-muted-foreground text-sm mb-8">
            Welcome to Visionary Academy. Your exclusive perks and badge will be
            activated when we launch. Keep an eye on your email for updates.
          </p>

          {sessionId && (
            <p className="text-xs text-muted-foreground mb-6 font-mono bg-muted rounded-lg px-3 py-2 inline-block">
              Order ID: {sessionId}
            </p>
          )}
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={visible ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Button asChild className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 text-white">
            <Link to="/dashboard">
              Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/pricing">
              <Crown className="w-4 h-4 mr-2" /> View Pricing
            </Link>
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
