
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Clipboard, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { toast } from './ui/use-toast';

class Password {
    static UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    static LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
    static NUMBERS = "0123456789";
    static SYMBOLS = "!@#$%^&*()_+-=[]{}|;:,.<>?";
    static SIMILAR_CHARS = "il1Lo0O";

    static generate(options: {
        length: number;
        includeUppercase: boolean;
        includeLowercase: boolean;
        includeNumbers: boolean;
        includeSymbols: boolean;
        excludeSimilar: boolean;
    }) {
        let charset = "";
        if (options.includeUppercase) charset += this.UPPERCASE;
        if (options.includeLowercase) charset += this.LOWERCASE;
        if (options.includeNumbers) charset += this.NUMBERS;
        if (options.includeSymbols) charset += this.SYMBOLS;
        
        if (options.excludeSimilar) {
            charset = charset.split('').filter(char => !this.SIMILAR_CHARS.includes(char)).join('');
        }
        
        if (charset.length === 0) {
            throw new Error("No character types selected");
        }

        let password = "";
        for (let i = 0; i < options.length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            password += charset[randomIndex];
        }
        return password;
    }

    static getStrength(password: string) {
        let score = 0;
        if (password.length >= 8) score += 1;
        if (password.length >= 12) score += 1;
        if (/[a-z]/.test(password)) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/[0-9]/.test(password)) score += 1;
        if (/[^A-Za-z0-9]/.test(password)) score += 1;

        if (score <= 2) return { score, label: 'Weak', color: 'text-red-500' };
        if (score <= 4) return { score, label: 'Medium', color: 'text-yellow-500' };
        return { score, label: 'Strong', color: 'text-green-500' };
    }
}


interface PasswordGeneratorProps {
    onPasswordGenerated?: (password: string) => void;
}

export const PasswordGenerator: React.FC<PasswordGeneratorProps> = ({ onPasswordGenerated }) => {
  const [options, setOptions] = useState({
    length: 16,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeSimilar: false,
  });
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(true);

  const generatePassword = () => {
    try {
        const newPassword = Password.generate(options);
        setGeneratedPassword(newPassword);
        onPasswordGenerated?.(newPassword);
    } catch {
        toast({ title: 'Please select at least one character type', variant: 'destructive' });
    }
  };

  const copyPassword = async () => {
    if (generatedPassword) {
      try {
        await navigator.clipboard.writeText(generatedPassword);
        toast({ variant: "success", title: 'Password copied to clipboard' });
      } catch (err) {
        toast({ title: 'Failed to copy password', variant: 'destructive' });
      }
    }
  };

  const strength = generatedPassword ? Password.getStrength(generatedPassword) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password Generator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
            <Label>Generated Password</Label>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Input
                        value={generatedPassword}
                        readOnly
                        placeholder="Click generate to create a password"
                        className="font-mono pr-10"
                        type={isPasswordVisible ? 'text' : 'password'}
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setIsPasswordVisible(prev => !prev)}
                        disabled={!generatedPassword}
                    >
                        {isPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                </div>
                <Button variant="outline" size="icon" onClick={copyPassword} disabled={!generatedPassword}>
                    <Clipboard className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={generatePassword}>
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>
            {strength && (
                <div className="text-sm">
                    Strength: <span className={strength.color}>{strength.label}</span>
                </div>
            )}
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Length: {options.length}</Label>
            <Slider
              value={[options.length]}
              onValueChange={([val]) => setOptions({ ...options, length: val })}
              max={50}
              min={4}
              step={1}
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="uppercase">Uppercase (A-Z)</Label>
              <Switch id="uppercase" checked={options.includeUppercase} onCheckedChange={(val) => setOptions({ ...options, includeUppercase: val })}/>
            </div>
             <div className="flex items-center justify-between">
              <Label htmlFor="lowercase">Lowercase (a-z)</Label>
              <Switch id="lowercase" checked={options.includeLowercase} onCheckedChange={(val) => setOptions({ ...options, includeLowercase: val })}/>
            </div>
             <div className="flex items-center justify-between">
              <Label htmlFor="numbers">Numbers (0-9)</Label>
              <Switch id="numbers" checked={options.includeNumbers} onCheckedChange={(val) => setOptions({ ...options, includeNumbers: val })}/>
            </div>
             <div className="flex items-center justify-between">
              <Label htmlFor="symbols">Symbols (!@#$%)</Label>
              <Switch id="symbols" checked={options.includeSymbols} onCheckedChange={(val) => setOptions({ ...options, includeSymbols: val })}/>
            </div>
             <div className="flex items-center justify-between">
              <Label htmlFor="excludeSimilar">Exclude Similar (il1Lo0O)</Label>
              <Switch id="excludeSimilar" checked={options.excludeSimilar} onCheckedChange={(val) => setOptions({ ...options, excludeSimilar: val })}/>
            </div>
          </div>
        </div>
        
        <Button onClick={generatePassword} className="w-full bg-gradient-accent">
          Generate Password
        </Button>
      </CardContent>
    </Card>
  );
};