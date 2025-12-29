import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from './ui/use-toast';
import { IPasswordEntry, Folder } from '../types';
import { Alert, AlertDescription } from './ui/alert';
import { FileDown, FileUp, AlertTriangle, Shield } from 'lucide-react';

class DataHandler {
    static exportToJSON(passwords: IPasswordEntry[], folders: Folder[]): string {
        const data = {
            version: '1.0.0',
            exportDate: new Date().toISOString(),
            passwords,
            folders,
        };
        return JSON.stringify(data, null, 2);
    }
    
    static importFromJSON(jsonString: string): { passwords: IPasswordEntry[], folders: Folder[] } {
        try {
            const data = JSON.parse(jsonString);
            return {
                passwords: data.passwords || [],
                folders: data.folders || [],
            }
        } catch (e) {
            throw new Error("Invalid JSON format");
        }
    }

    static parseLastPassCSV(csvString: string): {passwords: IPasswordEntry[], folders: Folder[]} {
        const lines = csvString.split('\n');
        // url,username,password,extra,name,grouping,fav
        const header = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        const entries: IPasswordEntry[] = [];
        
        for(let i=1; i<lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = this.parseCSVLine(line);
            
            if (values.length < 4) continue;
            
            const entry: IPasswordEntry = {
                id: crypto.randomUUID(),
                type: 'login',
                name: values[4] || 'Imported Entry',
                siteName: values[4] || '',
                url: values[0] || '',
                username: values[1] || '',
                password: values[2] || '',
                notes: values[3] || '',
                folder: values[5] || 'Imported',
                favorite: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                tags: []
            };
            entries.push(entry);
        }
        return { passwords: entries, folders: ["Imported"] };
    }

    static parseChromeCSV(csvString: string): {passwords: IPasswordEntry[], folders: Folder[]} {
        const lines = csvString.split('\n');
        // name,url,username,password
        const entries: IPasswordEntry[] = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = this.parseCSVLine(line);
            if(values.length < 3) continue;

            const entry: IPasswordEntry = {
                id: crypto.randomUUID(),
                type: 'login',
                name: this.extractDomainName(values[1]) || "Imported Entry",
                siteName: this.extractDomainName(values[1]) || "",
                url: values[1] || '',
                username: values[2] || '',
                password: values[3] || '',
                folder: 'Chrome Import',
                favorite: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                tags: []
            };
            entries.push(entry);
        }
        return { passwords: entries, folders: ["Chrome Import"] };
    }
    
    static parse1PasswordCSV(csvString: string): {passwords: IPasswordEntry[], folders: Folder[]} {
        const lines = csvString.split('\n');
        const entries: IPasswordEntry[] = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const values = this.parseCSVLine(line);
             if (values.length < 4) continue;
            const entry: IPasswordEntry = {
                id: crypto.randomUUID(),
                type: 'login',
                name: values[0] || 'Imported Entry',
                siteName: values[0] || '',
                url: values[1] || '',
                username: values[2] || '',
                password: values[3] || '',
                notes: values[4] || '',
                folder: '1Password Import',
                favorite: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                tags: [],
            };
            entries.push(entry);
        }
        return { passwords: entries, folders: ["1Password Import"] };
    }

    static parseCSVLine(line: string): string[] {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }

    static extractDomainName(url: string): string {
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch {
            return url;
        }
    }
    
    static exportToCSV(passwords: IPasswordEntry[]): string {
        const headers = ["Name", "URL", "Username", "Password", "Notes", "Folder"];
        const rows = [headers.join(',')];
        passwords.forEach(p => {
            const row = [
                `"${p.name || p.siteName || ''}"`,
                `"${p.url || ''}"`,
                `"${p.username || ''}"`,
                `"${p.password || ''}"`,
                `"${p.notes || ''}"`,
                `"${p.folder || ''}"`,
            ];
            rows.push(row.join(','));
        });
        return rows.join('\n');
    }
}


interface ImportExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  passwords: IPasswordEntry[];
  folders: Folder[];
  onImport: (passwords: IPasswordEntry[], folders: Folder[]) => void;
}

const ImportExportDialog: React.FC<ImportExportDialogProps> = ({ isOpen, onClose, passwords, folders, onImport }) => {
  const [importFormat, setImportFormat] = useState('');
  const [importData, setImportData] = useState('');
  const [exportFormat, setExportFormat] = useState('json');

  const handleImport = () => {
    if (!importData.trim()) {
        toast({ title: "Please paste your data to import", variant: "destructive" });
        return;
    }
    try {
        let importedPasswords: IPasswordEntry[] = [];
        let importedFolders: Folder[] = [];

        switch(importFormat) {
            case 'json': {
                const result = DataHandler.importFromJSON(importData);
                importedPasswords = result.passwords;
                importedFolders = result.folders;
                break;
            }
            case 'lastpass': {
                const result = DataHandler.parseLastPassCSV(importData);
                importedPasswords = result.passwords;
                importedFolders = result.folders;
                break;
            }
            case 'chrome': {
                const result = DataHandler.parseChromeCSV(importData);
                importedPasswords = result.passwords;
                importedFolders = result.folders;
                break;
            }
            case '1password': {
                const result = DataHandler.parse1PasswordCSV(importData);
                importedPasswords = result.passwords;
                importedFolders = result.folders;
                break;
            }
            default:
                throw new Error("Please select an import format");
        }
        onImport(importedPasswords, importedFolders);
        toast({ variant: "success", title: `Imported ${importedPasswords.length} passwords successfully` });
        onClose();
    } catch(e) {
        toast({ title: `Import failed: ${e instanceof Error ? e.message : 'Unknown error'}`, variant: "destructive" });
    }
  };

  const handleExport = () => {
    try {
        let data, filename, mimeType;
        switch(exportFormat) {
            case 'json': {
                data = DataHandler.exportToJSON(passwords, folders);
                filename = `password-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
                mimeType = 'application/json';
                break;
            }
            case 'csv': {
                data = DataHandler.exportToCSV(passwords);
                filename = `password-manager-export-${new Date().toISOString().split('T')[0]}.csv`;
                mimeType = 'text/csv';
                break;
            }
            default:
                 throw new Error("Please select an export format");
        }
        
        const blob = new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ variant: "success", title: 'Export completed successfully' });

    } catch(e) {
        toast({ title: `Export failed: ${e instanceof Error ? e.message : 'Unknown error'}`, variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import & Export Passwords</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="import" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="import" className="gap-2"><FileDown className="h-4 w-4"/>Import</TabsTrigger>
                <TabsTrigger value="export" className="gap-2"><FileUp className="h-4 w-4"/>Export</TabsTrigger>
            </TabsList>
            <TabsContent value="import" className="space-y-4">
                <Alert>
                    <Shield className="h-4 w-4"/>
                    <AlertDescription>
                        Import passwords from other password managers. Make sure to export from your current manager first.
                    </AlertDescription>
                </Alert>
                <div className="space-y-2">
                    <Label>Import Format</Label>
                    <Select value={importFormat} onValueChange={setImportFormat} defaultValue={importFormat}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select import format" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="json">JSON (Password Manager Backup)</SelectItem>
                            <SelectItem value="lastpass">LastPass CSV</SelectItem>
                            <SelectItem value="chrome">Chrome Passwords CSV</SelectItem>
                            <SelectItem value="1password">1Password CSV</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Paste Your Data</Label>
                    <Textarea placeholder="Paste your exported data here..." value={importData} onChange={(e) => setImportData(e.target.value)} rows={10} className="font-mono text-sm"/>
                </div>
                 <div className="space-y-2">
                    <Label>Instructions by Format:</Label>
                    <div className="text-sm text-gray-600 space-y-1">
                        <div><strong>LastPass:</strong> Export as CSV from LastPass vault</div>
                        <div><strong>Chrome:</strong> Go to Settings → Passwords → Export passwords</div>
                        <div><strong>1Password:</strong> Export as CSV from 1Password</div>
                        <div><strong>JSON:</strong> Use backup files from this password manager</div>
                    </div>
                </div>
                <Button onClick={handleImport} className="w-full bg-gradient-accent" disabled={!importFormat}>Import Passwords</Button>
            </TabsContent>
            <TabsContent value="export" className="space-y-4">
                <Alert>
                    <FileUp className="h-4 w-4"/>
                    <AlertDescription>
                        Export your passwords to backup or transfer to another password manager.
                    </AlertDescription>
                </Alert>
                <div className="space-y-2">
                    <Label>Export Format</Label>
                    <Select value={exportFormat} onValueChange={setExportFormat} defaultValue={exportFormat}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select export format" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="json">JSON (Recommended for backup)</SelectItem>
                            <SelectItem value="csv">CSV (Compatible with most managers)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="text-sm font-medium">Export Summary:</div>
                    <div className="text-sm text-gray-600">
                        &bull; {passwords.length} passwords will be exported
                        <br/>
                        &bull; {folders.length} folders will be included
                        <br/>
                        &bull; Export format: {exportFormat.toUpperCase()}
                    </div>
                </div>
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4"/>
                    <AlertDescription>
                       <strong>Security Warning:</strong> Exported files contain your passwords in readable format. Store them securely and delete after use.
                    </AlertDescription>
                </Alert>
                <Button onClick={handleExport} className="w-full gap-2 bg-gradient-accent">
                    <FileUp className="h-4 w-4" />
                    Export {passwords.length} Passwords
                </Button>
            </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ImportExportDialog;