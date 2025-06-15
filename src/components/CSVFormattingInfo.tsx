
import React from 'react';
import { Button } from '@/components/ui/button';
import { Info, Download, Type, Image } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { TemplateVariables } from '@/types/files';

interface CSVFormattingInfoProps {
  extractedVariables: TemplateVariables | null;
}

export function CSVFormattingInfo({ extractedVariables }: CSVFormattingInfoProps) {
    const { toast } = useToast();
    const hasVariables = extractedVariables && (extractedVariables.text.length > 0 || extractedVariables.images.length > 0);
    const totalVariables = extractedVariables ? extractedVariables.text.length + extractedVariables.images.length : 0;

    const handleDownloadTemplate = () => {
        if (!extractedVariables || totalVariables === 0) return;

        const allVariables = [...extractedVariables.text, ...extractedVariables.images];
        const csvHeader = allVariables.join(',');
        
        // Create example data
        const exampleRow = allVariables.map(v => {
            if (extractedVariables.images.includes(v)) {
                return 'logo.png'; // Example filename for image variables
            }
            return `[Example for ${v}]`; // Example text for text variables
        }).join(',');
        
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
            description: "template.csv has been downloaded with sample data.",
        });
    };

    return (
        <Accordion type="single" collapsible className="w-full border-b">
            <AccordionItem value="item-1" className="border-none">
                <AccordionTrigger className="text-base hover:no-underline">
                    <div className="flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        <span>How to format your CSV file</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="space-y-3 pt-2 text-sm text-muted-foreground">
                        <p>
                            Your CSV file provides the data to fill in the placeholders from your template. The easiest way to get started is to download our generated template.
                        </p>
                        <div className="rounded-md border bg-background p-4">
                            <h4 className="font-semibold mb-2 text-foreground">Your template requires {totalVariables || '...'} column(s):</h4>
                            {hasVariables ? (
                                <div className="space-y-3 mb-4">
                                    {extractedVariables.text.length > 0 && (
                                        <div>
                                            <h5 className="text-xs font-medium flex items-center gap-1 mb-1">
                                                <Type className="h-3 w-3" />
                                                Text Variables:
                                            </h5>
                                            <div className="flex flex-wrap gap-2">
                                                {extractedVariables.text.map(v => (
                                                    <code key={v} className="text-xs font-semibold p-1 bg-secondary text-secondary-foreground rounded-sm">{v}</code>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {extractedVariables.images.length > 0 && (
                                        <div>
                                            <h5 className="text-xs font-medium flex items-center gap-1 mb-1">
                                                <Image className="h-3 w-3" />
                                                Image Variables (use filenames):
                                            </h5>
                                            <div className="flex flex-wrap gap-2">
                                                {extractedVariables.images.map(v => (
                                                    <code key={v} className="text-xs font-semibold p-1 bg-blue-100 text-blue-700 rounded-sm">{v}</code>
                                                ))}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                For image variables, provide filenames like "logo.png", "photo.jpg", etc.
                                            </p>
                                        </div>
                                    )}
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
                                                variant="secondary"
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
                                This will download a <code>template.csv</code> file with the correct headers and sample data.
                            </p>
                        </div>
                        <p>
                            Each row in your CSV file will be used to generate one unique presentation.
                        </p>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}
