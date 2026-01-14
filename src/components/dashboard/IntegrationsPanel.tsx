import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  ShoppingCart, 
  Building2, 
  Mail, 
  Link2, 
  Check, 
  Copy, 
  Shield, 
  Lock,
  ExternalLink,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface Integration {
  id: string;
  integration_type: string;
  status: string;
  external_id: string | null;
  last_synced_at: string | null;
}

interface EmailInbox {
  id: string;
  unique_email: string;
  is_active: boolean;
  emails_received: number;
  last_email_at: string | null;
}

export function IntegrationsPanel() {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [emailInbox, setEmailInbox] = useState<EmailInbox | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    fetchIntegrations();
  }, [user?.id]);

  const fetchIntegrations = async () => {
    if (!user) return;
    setIsLoading(true);

    // Fetch integrations
    const { data: intData } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', user.id);
    
    setIntegrations(intData || []);

    // Fetch or create email inbox
    let { data: inboxData } = await supabase
      .from('email_inbox')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!inboxData) {
      // Create unique email for user
      const uniqueId = user.id.substring(0, 8);
      const uniqueEmail = `shop_${uniqueId}@receipts.marginmind.ai`;
      
      const { data: newInbox } = await supabase
        .from('email_inbox')
        .insert({
          user_id: user.id,
          unique_email: uniqueEmail,
        })
        .select()
        .single();
      
      inboxData = newInbox;
    }

    setEmailInbox(inboxData);
    setIsLoading(false);
  };

  const getIntegrationStatus = (type: string): Integration | undefined => {
    return integrations.find(i => i.integration_type === type);
  };

  const copyEmail = async () => {
    if (!emailInbox) return;
    await navigator.clipboard.writeText(emailInbox.unique_email);
    setIsCopied(true);
    toast.success('Email copied to clipboard');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleConnect = async (type: string) => {
    if (!user) return;

    // For demo, just create a pending integration
    const { error } = await supabase
      .from('integrations')
      .upsert({
        user_id: user.id,
        integration_type: type,
        status: 'pending',
      }, {
        onConflict: 'user_id,integration_type'
      });

    if (error) {
      toast.error('Failed to initiate connection');
      return;
    }

    toast.info(`${type === 'clover' ? 'Clover' : 'Plaid'} integration coming soon!`, {
      description: 'We will notify you when this feature is available.'
    });
    
    fetchIntegrations();
  };

  const cloverStatus = getIntegrationStatus('clover');
  const plaidStatus = getIntegrationStatus('plaid');

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Integrations</h2>
        <p className="text-sm text-muted-foreground">
          Connect your POS, bank, and email to automate expense tracking
        </p>
      </div>

      {/* Security Badge */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
        <Shield className="h-5 w-5 text-green-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-green-800">Bank-Level Security</p>
          <p className="text-xs text-green-700">256-bit encryption • SOC 2 compliant • Data never sold</p>
        </div>
        <Lock className="h-4 w-4 text-green-600" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Clover POS Integration */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <ShoppingCart className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Clover POS</CardTitle>
                    <CardDescription className="text-xs">
                      Sync sales, menu items, and modifiers
                    </CardDescription>
                  </div>
                </div>
                {cloverStatus?.status === 'connected' ? (
                  <Badge variant="default" className="gap-1">
                    <Check className="h-3 w-3" /> Connected
                  </Badge>
                ) : cloverStatus?.status === 'pending' ? (
                  <Badge variant="secondary" className="gap-1">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Pending
                  </Badge>
                ) : (
                  <Badge variant="outline">Not Connected</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Automatically import your Clover menu and track sales by item. 
                Real-time updates via webhooks keep your data fresh.
              </p>
              {cloverStatus?.status !== 'connected' && (
                <Button 
                  onClick={() => handleConnect('clover')} 
                  className="gap-2"
                  variant={cloverStatus?.status === 'pending' ? 'outline' : 'default'}
                >
                  <Link2 className="h-4 w-4" />
                  {cloverStatus?.status === 'pending' ? 'Pending Setup...' : 'Connect Clover'}
                </Button>
              )}
              {cloverStatus?.status === 'connected' && cloverStatus.last_synced_at && (
                <p className="text-xs text-muted-foreground">
                  Last synced: {new Date(cloverStatus.last_synced_at).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Plaid Bank Integration */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Bank Sync (Plaid)</CardTitle>
                    <CardDescription className="text-xs">
                      Auto-categorize bank transactions
                    </CardDescription>
                  </div>
                </div>
                {plaidStatus?.status === 'connected' ? (
                  <Badge variant="default" className="gap-1">
                    <Check className="h-3 w-3" /> Connected
                  </Badge>
                ) : plaidStatus?.status === 'pending' ? (
                  <Badge variant="secondary" className="gap-1">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Pending
                  </Badge>
                ) : (
                  <Badge variant="outline">Not Connected</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Link your business bank account to automatically track expenses. 
                Transactions are categorized and matched to vendors.
              </p>
              {plaidStatus?.status !== 'connected' && (
                <Button 
                  onClick={() => handleConnect('plaid')} 
                  className="gap-2"
                  variant={plaidStatus?.status === 'pending' ? 'outline' : 'default'}
                >
                  <Link2 className="h-4 w-4" />
                  {plaidStatus?.status === 'pending' ? 'Pending Setup...' : 'Link Bank Account'}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Email Concierge */}
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Email Concierge</CardTitle>
                    <CardDescription className="text-xs">
                      Forward invoices for automatic scanning
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="default" className="gap-1">
                  <Check className="h-3 w-3" /> Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Forward your vendor invoices to your unique email address. 
                We'll automatically extract items and update your inventory costs.
              </p>
              
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={emailInbox?.unique_email || ''}
                    readOnly
                    className="font-mono text-sm bg-background"
                  />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={copyEmail}
                    className="shrink-0"
                  >
                    {isCopied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {emailInbox?.emails_received || 0} emails received
                    {emailInbox?.last_email_at && (
                      <> • Last: {new Date(emailInbox.last_email_at).toLocaleDateString()}</>
                    )}
                  </span>
                  <a 
                    href="mailto:support@marginmind.ai" 
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    Need help? <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}