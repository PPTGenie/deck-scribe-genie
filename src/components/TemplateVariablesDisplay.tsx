
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Lightbulb } from 'lucide-react';

interface TemplateVariablesDisplayProps {
  variables: string[];
}

export function TemplateVariablesDisplay({ variables }: TemplateVariablesDisplayProps) {
  return (
    <div className="rounded-md border bg-secondary p-4 space-y-3 animate-in fade-in">
        <h3 className="font-semibold flex items-center gap-2">
            <Lightbulb className="text-yellow-500" />
            Found {variables.length} variable{variables.length !== 1 && 's'} in your template
        </h3>
        {variables.length > 0 ? (
            <div className="flex flex-wrap gap-2">
            {variables.map((variable) => (
                <Badge key={variable} variant="secondary">
                {`{{${variable}}}`}
                </Badge>
            ))}
            </div>
        ) : (
            <p className="text-sm text-muted-foreground">
                No variables like <code>{'{{variable_name}}'}</code> were found. Make sure your template uses this format.
            </p>
        )}
    </div>
  );
}
