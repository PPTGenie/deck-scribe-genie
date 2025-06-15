
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2, Download, RotateCcw } from 'lucide-react';
import { validateImageExtension, generateCorrectedCSV } from '@/lib/imageValidation';
import Papa from 'papaparse';

interface ImageValidationIssue {
  row: number;
  column: string;
  filename: string;
  validation: {
    isValid: boolean;
    suggestedFix?: string;
    error?: string;
  };
}

interface ImageValidationErrorsProps {
  issues: ImageValidationIssue[];
  csvData: Record<string, string>[];
  imageColumns: string[];
  onFixedCSVDownload?: (csvContent: string) => void;
  onRetryUpload?: () => void;
}

export function ImageValidationErrors({
  issues,
  csvData,
  imageColumns,
  onFixedCSVDownload,
  onRetryUpload,
}: ImageValidationErrorsProps) {
  if (issues.length === 0) {
    return (
      <Alert className="border-green-500 bg-green-50 text-green-900 dark:border-green-700 dark:bg-green-950 dark:text-green-200">
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle>All Image References Valid</AlertTitle>
        <AlertDescription>
          All image filenames in your CSV have valid extensions.
        </AlertDescription>
      </Alert>
    );
  }

  const handleDownloadCorrectedCSV = () => {
    const correctedData = generateCorrectedCSV(csvData, imageColumns);
    const csv = Papa.unparse(correctedData);
    
    if (onFixedCSVDownload) {
      onFixedCSVDownload(csv);
    } else {
      // Fallback: trigger download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'corrected_data.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const fixableIssues = issues.filter(issue => issue.validation.suggestedFix);
  const unfixableIssues = issues.filter(issue => !issue.validation.suggestedFix);

  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Image Filename Issues Found</AlertTitle>
        <AlertDescription>
          {issues.length} issue{issues.length > 1 ? 's' : ''} found in your CSV image references. 
          {fixableIssues.length > 0 && (
            <span> {fixableIssues.length} can be automatically corrected.</span>
          )}
        </AlertDescription>
      </Alert>

      {fixableIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-green-700 dark:text-green-300">
              Auto-Correctable Issues ({fixableIssues.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {fixableIssues.slice(0, 5).map((issue, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/50 rounded-lg">
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    Row {issue.row}, Column "{issue.column}"
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="line-through text-red-600">{issue.filename}</span>
                    {' → '}
                    <span className="text-green-600 font-medium">{issue.validation.suggestedFix}</span>
                  </div>
                </div>
              </div>
            ))}
            {fixableIssues.length > 5 && (
              <div className="text-sm text-muted-foreground">
                ... and {fixableIssues.length - 5} more
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleDownloadCorrectedCSV} size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download Corrected CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {unfixableIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-red-700 dark:text-red-300">
              Manual Correction Required ({unfixableIssues.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {unfixableIssues.slice(0, 5).map((issue, index) => (
              <div key={index} className="p-3 bg-red-50 dark:bg-red-950/50 rounded-lg">
                <div className="text-sm font-medium">
                  Row {issue.row}, Column "{issue.column}": {issue.filename}
                </div>
                <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {issue.validation.error}
                </div>
              </div>
            ))}
            {unfixableIssues.length > 5 && (
              <div className="text-sm text-muted-foreground">
                ... and {unfixableIssues.length - 5} more
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        {onRetryUpload && (
          <Button variant="outline" onClick={onRetryUpload}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Upload Different CSV
          </Button>
        )}
      </div>
    </div>
  );
}
