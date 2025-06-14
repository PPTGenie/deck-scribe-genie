
import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Download } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

interface CSVFormattingInfoProps {
  extractedVariables: string[] | null;
}

export function CSVFormattingInfo({ extractedVariables }: CSVFormattingInfoProps) {
    const { toast } = useToast();
    const hasVariables = extractedVariables && extractedVariables.length > 0;

    const handleDownloadTemplate = () => {
        if (!extractedVariables || extractedVariables.length === 0) return;

        const csvHeader = extractedVariables.join(',');
        const exampleRow = extractedVariables.map(v => `[Example for ${v}]`).join(',');
        const csvContent = `${csvHeader}\n${exampleRow}`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "template.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({
            title: "✅ Template Downloaded",
            description: "template.csv has been downloaded with a sample row.",
        });
    };

    return (
        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-500" />
            <AlertTitle className="text-blue-800 dark:text-blue-300">
                How to Format Your CSV Data
            </AlertTitle>
            <AlertDescription className="space-y-3 text-blue-700 dark:text-blue-300/90">
                <p>
                    Your CSV file provides the data to fill in the placeholders from your template. The easiest way to get started is to download our generated template.
                </p>
                <div className="rounded-md bg-background/50 p-4">
                    <h4 className="font-semibold mb-2">Your template requires {extractedVariables?.length || '...'} column(s):</h4>
                    {hasVariables ? (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {extractedVariables.map(v => <code key={v} className="text-xs font-semibold p-1 bg-blue-100 dark:bg-blue-900 rounded-sm">{v}</code>)}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground italic mb-4">Upload a template in Step 1 to see required columns.</p>
                    )}

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="inline-block">
                                    <Button
                                        onClick={handleDownloadTemplate}
                                        disabled={!hasVariables}
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        Download CSV Template
                                    </Button>
                                </div>
                            </TooltipTrigger>
                            {!hasVariables && (
                                <TooltipContent>
                                    <p>First, upload a template in Step 1.</p>
                                </TooltipContent>
                            )}
                        </Tooltip>
                    </TooltipProvider>
                    <p className="text-xs text-muted-foreground mt-2">
                        This will download a <code>template.csv</code> file with the correct headers and a sample row.
                    </p>
                </div>
                <p>
                    Each row in your CSV file will be used to generate one unique presentation.
                </p>
            </AlertDescription>
        </Alert>
    );
}
