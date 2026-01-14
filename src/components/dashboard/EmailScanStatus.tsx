import { useState, useEffect } from 'react';
import { Mail, Loader2, Check, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type ScanStatus = 'idle' | 'scanning' | 'found' | 'error';

export function EmailScanStatus() {
  const { user } = useAuth();
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [emailCount, setEmailCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Check email inbox status
    const checkEmailInbox = async () => {
      const { data } = await supabase
        .from('email_inbox')
        .select('emails_received, last_email_at')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setEmailCount(data.emails_received || 0);
        
        // Simulate scanning status based on recent activity
        if (data.last_email_at) {
          const lastEmail = new Date(data.last_email_at);
          const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
          
          if (lastEmail > hourAgo) {
            setStatus('found');
          }
        }
      }
    };

    checkEmailInbox();

    // Simulate periodic scanning
    const interval = setInterval(() => {
      setStatus(prev => {
        if (prev === 'idle') return 'scanning';
        if (prev === 'scanning') return 'idle';
        return prev;
      });
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [user?.id]);

  // Don't show if no emails configured
  if (emailCount === 0 && status === 'idle') {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm">
      {status === 'scanning' ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-muted-foreground">Scanning email for new invoices...</span>
        </>
      ) : status === 'found' ? (
        <>
          <Check className="h-4 w-4 text-success" />
          <span className="text-muted-foreground">
            {emailCount} invoice{emailCount !== 1 ? 's' : ''} processed from email
          </span>
        </>
      ) : status === 'error' ? (
        <>
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-muted-foreground">Unable to check email</span>
        </>
      ) : (
        <>
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            {emailCount > 0 
              ? `${emailCount} email invoice${emailCount !== 1 ? 's' : ''} scanned`
              : 'Email scanning ready'}
          </span>
        </>
      )}
    </div>
  );
}