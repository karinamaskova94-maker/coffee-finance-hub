import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, Coffee, Lock, Mail, ArrowRight, UserPlus } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      if (isSignUp) {
        const result = await signup(email, password);
        if (result.success) {
          setSuccessMessage('Account created successfully! You can now sign in.');
          setIsSignUp(false);
        } else {
          setError(result.error || 'Failed to create account.');
        }
      } else {
        const result = await login(email, password);
        if (result.success) {
          navigate('/dashboard');
        } else {
          setError(result.error || 'Invalid credentials. Please try again.');
        }
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left Panel - Branding */}
      <div className="lg:flex-1 bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6 sm:p-8 lg:p-12 flex flex-col justify-between min-h-[35vh] lg:min-h-screen relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 sm:w-64 h-48 sm:h-64 bg-success/5 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/15 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-foreground">Profit Pulse</span>
          </div>
        </div>

        <div className="my-6 lg:my-0 relative z-10">
          <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-6 leading-tight">
            Your Coffee Shop's
            <span className="text-primary block mt-1 sm:mt-2">Financial Health</span>
            Dashboard
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-md">
            Transform messy daily data into clear, actionable insights. Know your real profit — clean of taxes and tips.
          </p>
        </div>

        <div className="hidden lg:flex items-center gap-3 text-muted-foreground relative z-10">
          <Coffee className="w-5 h-5" />
          <span className="text-sm">Trusted by 2,400+ coffee shop owners</span>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          <div className="glass-card p-6 sm:p-8">
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
                {isSignUp ? 'Create an account' : 'Welcome back'}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                {isSignUp ? 'Sign up to get started' : 'Sign in to access your dashboard'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground text-sm font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="owner@coffeeshop.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 sm:h-12 bg-card border-border"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground text-sm font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11 sm:h-12 bg-card border-border"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-xl bg-success/10 border border-success/20 text-success text-sm">
                  {successMessage}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 sm:h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    {isSignUp ? 'Creating account...' : 'Signing in...'}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {isSignUp ? (
                      <>
                        Create account
                        <UserPlus className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        Sign in
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setSuccessMessage('');
                }}
                className="text-primary hover:underline text-sm font-medium"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
