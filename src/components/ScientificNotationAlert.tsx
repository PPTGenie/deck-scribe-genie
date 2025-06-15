
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';

interface ScientificNotationConversion {
  row: number;
  column: string;
  original: string;
  converted: string;
}

interface ScientificNotationAlertProps {
  conversions: ScientificNotationConversion[];
}

export function ScientificNotationAlert({ conversions }: ScientificNotationAlertProps) {
  if (conversions.length === 0) {
    return null;
  }

  return (
    <Alert className="border-blue-500 bg-blue-50 text-blue-900 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-200">
      <Info className="h-4 w-4" />
      <AlertTitle>Scientific Notation Converted</AlertTitle>
      <AlertDescription>
        <div className="space-y-2">
          <p>
            Found and converted {conversions.length} scientific notation value{conversions.length > 1 ? 's' : ''} to full numbers:
          </p>
          
          {conversions.length <= 5 ? (
            <div className="space-y-1">
              {conversions.map((conversion, index) => (
                <div key={index} className="text-sm">
                  <strong>Row {conversion.row}, Column "{conversion.column}":</strong>{' '}
                  <span className="font-mono text-red-600">{conversion.original}</span>
                  {' → '}
                  <span className="font-mono text-green-600">{conversion.converted}</span>
                </div>
              ))}
            </div>
          ) : (
            <Card className="mt-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Conversions ({conversions.length})</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 max-h-32 overflow-y-auto">
                <div className="space-y-1">
                  {conversions.map((conversion, index) => (
                    <div key={index} className="text-xs">
                      <strong>Row {conversion.row}, {conversion.column}:</strong>{' '}
                      <span className="font-mono text-red-600">{conversion.original}</span>
                      {' → '}
                      <span className="font-mono text-green-600">{conversion.converted}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
