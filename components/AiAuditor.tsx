import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { IPasswordEntry } from '../types';
import { getPasswordAudit, runDarkWebAudit } from '../services/geminiService';
import { Link } from 'lucide-react';
import { toast } from './ui/use-toast';

interface AiAuditorProps {
  entries: IPasswordEntry[];
}

const AiAuditor: React.FC<AiAuditorProps> = ({ entries }) => {
  const [emailToAudit, setEmailToAudit] = useState('');
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [emailAuditResult, setEmailAuditResult] = useState<{ report: string; sources: any[] } | null>(null);

  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [passwordAuditResult, setPasswordAuditResult] = useState<string | null>(null);

  const vaultEmails = useMemo(() => {
    const emails = new Set<string>();
    entries.forEach(entry => {
      if (entry.type === 'login' && entry.username && entry.username.includes('@')) {
        emails.add(entry.username);
      }
      if (entry.type === 'identity' && entry.email) {
        emails.add(entry.email);
      }
    });
    return Array.from(emails);
  }, [entries]);

  const handleEmailAudit = async () => {
    if (!emailToAudit) {
      toast({
        title: "No email provided",
        description: "Please enter an email address to audit.",
        variant: "destructive",
      });
      return;
    }

    setIsEmailLoading(true);
    setEmailAuditResult(null);
    try {
      const result = await runDarkWebAudit(emailToAudit);
      setEmailAuditResult(result);
    } catch (error) {
      console.error("Audit failed:", error);
      toast({
        title: "Audit Failed",
        description: "An error occurred while running the security audit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handlePasswordAudit = async () => {
    setIsPasswordLoading(true);
    setPasswordAuditResult(null);
    try {
      const result = await getPasswordAudit(entries);
      setPasswordAuditResult(result);
    } catch (error) {
      console.error("Password audit failed:", error);
      toast({
        title: "Password Audit Failed",
        description: "An error occurred while running the password audit. Please try again.",
        variant: "destructive",
      });
       setPasswordAuditResult("<h3>Error</h3><p>An error occurred while running the password audit.</p>");
    } finally {
      setIsPasswordLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Security Auditor</CardTitle>
        <CardDescription>
          Check if your email has been exposed in known data breaches and analyze the security of your saved passwords.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Dark Web Breach Scan</h3>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Input 
              type="email" 
              placeholder="Enter email to audit" 
              value={emailToAudit}
              onChange={(e) => setEmailToAudit(e.target.value)}
              className="flex-1"
            />
            {vaultEmails.length > 0 && (
              <Select onValueChange={(value) => setEmailToAudit(value)}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Or select from vault" />
                </SelectTrigger>
                <SelectContent>
                  {vaultEmails.map((email) => (
                    <SelectItem key={email} value={email}>{email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button onClick={handleEmailAudit} disabled={isEmailLoading} className="bg-gradient-accent w-full sm:w-auto">
              {isEmailLoading ? 'Auditing...' : 'Start Audit'}
            </Button>
          </div>

          {isEmailLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">AI is scanning for breaches... This may take a moment.</p>
            </div>
          )}
          
          {emailAuditResult && (
            <Card className="bg-muted">
              <CardContent className="p-6">
                <div 
                  className="prose max-w-none text-sm text-foreground" 
                  dangerouslySetInnerHTML={{ __html: emailAuditResult.report }} 
                />
                {emailAuditResult.sources && emailAuditResult.sources.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold text-foreground mb-2">Sources</h4>
                    <ul className="list-none p-0 space-y-1 text-xs">
                      {emailAuditResult.sources.map((source, index) => (
                        <li key={index}>
                          <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1.5 break-all">
                            <Link className="h-3 w-3 flex-shrink-0" /> <span>{source.web.title || source.web.uri}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        
        <div className="border-t -mx-6" />

        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Password Checkup</h3>
                    <p className="text-sm text-muted-foreground">Analyze the strength and security of your saved passwords.</p>
                </div>
                <Button onClick={handlePasswordAudit} disabled={isPasswordLoading} className="bg-gradient-accent">
                    {isPasswordLoading ? 'Checking...' : 'Check Passwords'}
                </Button>
            </div>

            {isPasswordLoading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">AI is analyzing your password security...</p>
              </div>
            )}

            {passwordAuditResult && (
              <Card className="bg-muted">
                <CardContent className="p-6">
                  <div 
                    className="prose max-w-none text-sm text-foreground" 
                    dangerouslySetInnerHTML={{ __html: passwordAuditResult }} 
                  />
                </CardContent>
              </Card>
            )}
        </div>

      </CardContent>
    </Card>
  );
};

export default AiAuditor;