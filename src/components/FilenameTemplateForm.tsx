
import React, { useState, useEffect } from 'react';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface FilenameTemplateFormProps {
  csvPreview: { headers: string[]; data: Record<string, string>[] };
  filenameTemplate: string;
  setFilenameTemplate: React.Dispatch<React.SetStateAction<string>>;
  setFilenameError: (error: string | null) => void;
}

const renderTemplate = (template: string, data: Record<string, string>): string => {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => data[key.trim()] || `{{${key}}}`);
};

const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[<>:"/\\|?*]/g, '_').slice(0, 200);
};

export function FilenameTemplateForm({ csvPreview, filenameTemplate, setFilenameTemplate, setFilenameError }: FilenameTemplateFormProps) {
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);
  const [invalidVariables, setInvalidVariables] = useState<string[]>([]);
  
  useEffect(() => {
    const variables = Array.from(filenameTemplate.matchAll(/\{\{([^}]+)\}\}/g)).map(match => match[1].trim());
    setTemplateVariables(variables);
    
    const invalid = variables.filter(v => !csvPreview.headers.includes(v));
    setInvalidVariables(invalid);

    if (invalid.length > 0) {
      setFilenameError(`Template contains invalid variables: ${invalid.join(', ')}`);
    } else if (!variables.length) {
      setFilenameError('Filename template must contain at least one variable.');
    } else {
      setFilenameError(null);
    }
  }, [filenameTemplate, csvPreview.headers, setFilenameError]);

  const addVariable = (variable: string) => {
    setFilenameTemplate((current) => `${current}{{${variable}}}`);
  };

  const previewFilenames = csvPreview.data.slice(0, 3).map((row, i) => ({
    original: `row ${i + 1}`,
    generated: sanitizeFilename(renderTemplate(filenameTemplate, row)) + '.pptx',
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>File Naming</CardTitle>
        <CardDescription>
          Customize how your generated presentations will be named. Use variables from your CSV.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="filename-template">Filename Template</Label>
          <div className="flex gap-2">
            <Input
              id="filename-template"
              value={filenameTemplate}
              onChange={(e) => setFilenameTemplate(e.target.value)}
              placeholder="{{company_name}} - Deck"
            />
            <Select onValueChange={addVariable}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Add variable" />
              </SelectTrigger>
              <SelectContent>
                {csvPreview.headers.map(header => (
                  <SelectItem key={header} value={header}>{header}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {invalidVariables.length > 0 ? (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Invalid Variables</AlertTitle>
            <AlertDescription>
              The following variables are not in your CSV headers: {invalidVariables.join(', ')}.
            </AlertDescription>
          </Alert>
        ) : templateVariables.length === 0 ? (
            <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>No Variables Found</AlertTitle>
                <AlertDescription>
                Your template must include at least one placeholder like `{"{{ColumnName}}"}`.
                </AlertDescription>
            </Alert>
        ) : (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Template is valid!</AlertTitle>
            <AlertDescription>
              Your filenames will be generated based on this template.
            </AlertDescription>
          </Alert>
        )}

        <div>
          <Label>Filename Preview</Label>
          <div className="mt-2 rounded-md border p-2 space-y-1 bg-muted/50">
            {previewFilenames.map(p => (
              <p key={p.original} className="text-sm font-mono text-muted-foreground truncate" title={p.generated}>
                {p.generated}
              </p>
            ))}
            {csvPreview.data.length > 3 && <p className="text-sm font-mono text-muted-foreground">...</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
