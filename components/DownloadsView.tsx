import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Monitor, Smartphone, Globe, Chrome, Apple, Command } from 'lucide-react';

const DownloadsView: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="text-center space-y-2 mb-8">
                <h2 className="text-3xl font-bold tracking-tight">Download Lens Vault</h2>
                <p className="text-muted-foreground">Secure your digital life on every device.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Browser Extension - Available */}
                <Card className="border-primary/50 shadow-lg bg-primary/5">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto bg-background p-3 rounded-full mb-2 border border-primary/20">
                            <Chrome className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle>Browser Extension</CardTitle>
                        <CardDescription>For Chrome, Edge, & Brave</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Badge className="mb-4 bg-green-500 hover:bg-green-600">Available Now</Badge>
                        <p className="text-sm text-foreground/80 mb-6">
                            Auto-fill passwords, capture logins, and secure your browsing.
                        </p>
                        <Button className="w-full bg-gradient-accent" onClick={() => window.open('https://chrome.google.com/webstore', '_blank')}>
                            Install Extension
                        </Button>
                    </CardContent>
                </Card>

                {/* Web App - Available */}
                <Card className="border-primary/50 shadow-lg">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto bg-primary/10 p-3 rounded-full mb-2">
                            <Globe className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle>Web Vault</CardTitle>
                        <CardDescription>Access from any browser</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Badge className="mb-4 bg-green-500 hover:bg-green-600">Available Now</Badge>
                        <p className="text-sm text-foreground/80 mb-6">
                            Manage your vault, security audit, and settings instantly.
                        </p>
                        <Button variant="outline" className="w-full" disabled>
                            You are here
                        </Button>
                    </CardContent>
                </Card>

                {/* macOS - Coming Soon */}
                <Card className="opacity-80">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto bg-muted p-3 rounded-full mb-2">
                            <Command className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <CardTitle>macOS</CardTitle>
                        <CardDescription>For MacBook & iMac</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Badge variant="secondary" className="mb-4">Coming Soon</Badge>
                        <p className="text-sm text-muted-foreground mb-6">
                            Native desktop experience with TouchID support.
                        </p>
                        <Button variant="ghost" className="w-full" disabled>
                            Notifier Me
                        </Button>
                    </CardContent>
                </Card>

                {/* Windows - Coming Soon */}
                <Card className="opacity-80">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto bg-muted p-3 rounded-full mb-2">
                            <Monitor className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <CardTitle>Windows Desktop</CardTitle>
                        <CardDescription>Windows 10 & 11</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Badge variant="secondary" className="mb-4">Coming Soon</Badge>
                        <p className="text-sm text-muted-foreground mb-6">
                            Secure desktop access with Windows Hello integration.
                        </p>
                        <Button variant="ghost" className="w-full" disabled>
                            Notify Me
                        </Button>
                    </CardContent>
                </Card>

                {/* Mobile - Coming Soon */}
                <Card className="opacity-80 md:col-span-3 lg:col-span-1">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto bg-muted p-3 rounded-full mb-2">
                            <Smartphone className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <CardTitle>Mobile App</CardTitle>
                        <CardDescription>iOS & Android</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Badge variant="secondary" className="mb-4">Coming Soon</Badge>
                        <p className="text-sm text-muted-foreground mb-6">
                            Biometric unlock and auto-fill for mobile apps.
                        </p>
                        <Button variant="ghost" className="w-full" disabled>
                            Notify Me
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default DownloadsView;
