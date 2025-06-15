
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Type, Image } from 'lucide-react';
import type { TemplateVariables } from '@/types/files';

interface TemplateVariablesDisplayProps {
  variables: TemplateVariables;
}

export function TemplateVariablesDisplay({ variables }: TemplateVariablesDisplayProps) {
  const totalVariables = variables.text.length + variables.images.length;

  return (
    <div className="rounded-md border bg-secondary p-4 space-y-3 animate-in fade-in">
        <h3 className="font-semibold flex items-center gap-2">
            <Lightbulb className="text-yellow-500" />
            Found {totalVariables} variable{totalVariables !== 1 && 's'} in your template
        </h3>
        
        {variables.text.length > 0 && (
            <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Text Variables ({variables.text.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                    {variables.text.map((variable) => (
                        <Badge key={variable} variant="secondary">
                            {`{{${variable}}}`}
                        </Badge>
                    ))}
                </div>
            </div>
        )}

        {variables.images.length > 0 && (
            <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Image Variables ({variables.images.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                    {variables.images.map((variable) => (
                        <Badge key={variable} variant="outline" className="border-blue-500 text-blue-700">
                            {`{{${variable}}}`}
                        </Badge>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground">
                    Image variables should contain filenames (e.g., "logo.png", "company-photo.jpg")
                </p>
            </div>
        )}

        {totalVariables === 0 && (
            <p className="text-sm text-muted-foreground">
                No variables like <code>{'{{variable_name}}'}</code> were found. Make sure your template uses this format.
            </p>
        )}
    </div>
  );
}
