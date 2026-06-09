'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Star } from 'lucide-react';
import { toast } from 'sonner';

// Animated counter component for stats
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    const duration = 2000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };
    requestAnimationFrame(animate);
  }, [target]);

  return (
    <span ref={ref} className="text-[oklch(0.65_0.18_250)] font-bold">
      {count.toLocaleString()}{suffix}
    </span>
  );
}

// Floating particle for the left panel background
function Particle({ delay, x, y, size }: { delay: number; x: number; y: number; size: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-white/10"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
      animate={{
        y: [0, -30, 0],
        opacity: [0.15, 0.4, 0.15],
      }}
      transition={{
        duration: 6 + Math.random() * 4,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

export function LoginPage() {
  const login = useAppStore((s) => s.login);
  const { locale, setLocale } = useAppStore();
  const { t } = useTranslation();
  const [email, setEmail] = useState('alex@acmecorp.com');
  const [password, setPassword] = useState('password');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (email && password) {
      login(email, password);
      toast.success(t.toast.welcomeBack);
    } else {
      setError(t.login.enterCredentials);
    }
    setIsLoading(false);
  };

  // Stats data — PM-specific metrics
  const stats = [
    { value: 10, suffix: 'K+', label: t.login.statTeams },
    { value: 50, suffix: 'K+', label: t.login.statTasks },
    { value: 99.9, suffix: '%', label: t.login.statUptime },
    { value: 150, suffix: '+', label: t.login.statCountries },
  ];

  // Client-only mounting to avoid hydration mismatch with Math.random
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Generate particles for the left panel (client-only to avoid hydration mismatch)
  const particles = useRef<{ id: number; delay: number; x: number; y: number; size: number }[] | null>(null);
  if (mounted && !particles.current) {
    particles.current = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      delay: Math.random() * 5,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 4,
    }));
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Language toggle */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-4 right-4 z-20 text-xs font-bold h-8 px-3"
        onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')}
      >
        {locale.toUpperCase()}
      </Button>
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[oklch(0.17_0.02_155)] via-[oklch(0.20_0.04_155)] to-[oklch(0.15_0.06_160)] items-center justify-center p-12">
        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-[oklch(0.55_0.18_250/0.1)] blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-10 w-96 h-96 rounded-full bg-[oklch(0.55_0.18_250/0.07)] blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-[oklch(0.65_0.15_80/0.08)] blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        {/* Animated floating particles */}
        {mounted && particles.current?.map((p) => (
          <Particle key={p.id} delay={p.delay} x={p.x} y={p.y} size={p.size} />
        ))}

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }} />

        {/* Loading shimmer overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.03) 45%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 55%, transparent 60%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer-move 8s ease-in-out infinite',
          }}
        />

        <div className="relative z-10 max-w-lg w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[oklch(0.55_0.18_250)] to-[oklch(0.45_0.18_250)] flex items-center justify-center shadow-lg shadow-[oklch(0.55_0.18_250)/20]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white" fillOpacity="0.9"/>
                  <path d="M2 17L12 22L22 17" stroke="white" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="white" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-2xl font-bold text-white tracking-tight">TeamFlow PM</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
              {t.login.leftTitle1}<br />
              <span className="text-[oklch(0.65_0.18_250)]">{t.login.leftTitle2}</span>
            </h1>
            <p className="text-lg text-white/60 mb-8 leading-relaxed">
              {t.login.leftSubtitle}
            </p>

            {/* Feature highlights */}
            <div className="space-y-4">
              {[
                { icon: '📋', title: t.login.feature1Title, desc: t.login.feature1Desc },
                { icon: '📈', title: t.login.feature2Title, desc: t.login.feature2Desc },
                { icon: '👥', title: t.login.feature3Title, desc: t.login.feature3Desc },
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.15 }}
                  className="flex items-start gap-3"
                >
                  <span className="text-lg mt-0.5">{feature.icon}</span>
                  <div>
                    <div className="text-sm font-semibold text-white/90">{feature.title}</div>
                    <div className="text-xs text-white/50">{feature.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Animated Stats/Ticker */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
              className="mt-8 flex items-center gap-4 flex-wrap"
            >
              {stats.map((stat, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="text-2xl font-bold">
                    <AnimatedCounter target={stat.value === 99.9 ? 99 : stat.value} suffix={stat.value === 99.9 ? '' : stat.suffix} />
                    {stat.value === 99.9 && <span>.9%</span>}
                  </span>
                  <span className="text-xs text-white/50">{stat.label}</span>
                  {i < stats.length - 1 && (
                    <span className="text-white/20 ml-2">&middot;</span>
                  )}
                </div>
              ))}
            </motion.div>

            {/* Floating Testimonial Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.2 }}
              className="mt-8"
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4"
              >
                <p className="text-sm text-white/70 italic leading-relaxed mb-3">
                  &ldquo;{t.login.testimonialText}&rdquo;
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[oklch(0.55_0.18_250)] to-[oklch(0.45_0.18_250)] flex items-center justify-center text-white text-xs font-bold shadow-md">
                      {t.login.testimonialName.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white/90">{t.login.testimonialName}</div>
                      <div className="text-[10px] text-white/50">{t.login.testimonialRole}</div>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Trust Badges Row */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.5 }}
              className="mt-5 flex items-center gap-2 flex-wrap"
            >
              {[
                { label: t.login.sslSecured, icon: '🔒' },
                { label: t.login.soc2Compliant, icon: '✓' },
                { label: t.login.gdprReady, icon: '🛡️' },
              ].map((badge, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-[11px] text-white/50 font-medium backdrop-blur-sm"
                >
                  <span className="text-xs">{badge.icon}</span>
                  {badge.label}
                </span>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[oklch(0.55_0.18_250)] to-[oklch(0.45_0.18_250)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white" fillOpacity="0.9"/>
                <path d="M2 17L12 22L22 17" stroke="white" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="white" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight">TeamFlow PM</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2">{t.login.welcomeBack}</h2>
            <p className="text-muted-foreground">{t.login.subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">{t.login.email}</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t.login.password}</Label>
                <button type="button" className="text-xs text-[oklch(0.55_0.18_250)] hover:text-[oklch(0.45_0.18_250)] font-medium">
                  {t.login.forgotPassword}
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember me checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                className="data-[state=checked]:bg-[oklch(0.55_0.18_250)] data-[state=checked]:border-[oklch(0.55_0.18_250)]"
              />
              <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground cursor-pointer">
                {t.login.rememberMe}
              </Label>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sign In button with shimmer/glow animation */}
            <div className="relative group">
              {/* Glow effect behind button */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[oklch(0.55_0.18_250)] via-[oklch(0.65_0.15_100)] to-[oklch(0.55_0.18_250)] rounded-lg opacity-0 group-hover:opacity-40 blur-md transition-opacity duration-500" />
              <Button
                type="submit"
                className="relative w-full h-11 bg-[oklch(0.55_0.18_250)] hover:bg-[oklch(0.48_0.18_250)] text-white font-medium overflow-hidden"
                disabled={isLoading}
              >
                {/* Shimmer overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 45%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.15) 55%, transparent 60%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer-move 3s ease-in-out infinite',
                    }}
                  />
                </div>
                <span className="relative z-10">
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t.login.signingIn}
                    </div>
                  ) : (
                    t.login.signIn
                  )}
                </span>
              </Button>
            </div>
          </form>

          {/* Footer links below sign-in button */}
          <div className="mt-4 flex items-center justify-between text-xs">
            <button type="button" className="text-[oklch(0.55_0.18_250)] hover:text-[oklch(0.45_0.18_250)] font-medium transition-colors">
              {t.login.forgotPasswordLink}
            </button>
            <button type="button" className="text-muted-foreground hover:text-foreground font-medium transition-colors">
              {t.login.signUpLink}
            </button>
          </div>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {t.login.noAccount}{' '}
            <button className="text-[oklch(0.55_0.18_250)] hover:text-[oklch(0.45_0.18_250)] font-medium">
              {t.login.createOne}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
