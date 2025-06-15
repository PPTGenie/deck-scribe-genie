
import React from 'react';
import { useSidebar } from '@/components/ui/sidebar';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';
import { JobCreationProgress } from './JobCreationProgress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

interface StickyNavigationProps {
    currentStep: number;
    totalSteps: number;
    goToPrevStep: () => void;
    handleNextWithTooltip: () => void;
    handleStartJob: () => void;
    isNextDisabled: boolean;
    isStartingJob: boolean;
    jobProgress: { value: number; message: string } | null;
    filenameError: string | null;
    showNextButtonTooltip: boolean;
}

export function StickyNavigation({
    currentStep,
    totalSteps,
    goToPrevStep,
    handleNextWithTooltip,
    handleStartJob,
    isNextDisabled,
    isStartingJob,
    jobProgress,
    filenameError,
    showNextButtonTooltip,
}: StickyNavigationProps) {
    const { open: sidebarOpen, isMobile } = useSidebar();

    return (
        <div 
            className="fixed bottom-0 right-0 z-10 border-t bg-background/95 backdrop-blur-sm transition-[left] duration-200 ease-linear"
            style={{ left: isMobile ? 0 : (sidebarOpen ? 'var(--sidebar-width)' : 'var(--sidebar-width-icon)') }}
        >
            <div className="container mx-auto flex h-20 max-w-4xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <div> {/* Left container */}
                    {currentStep > 0 ? (
                        <Button variant="outline" onClick={goToPrevStep} disabled={isStartingJob}>
                            Back
                        </Button>
                    ) : <div />}
                </div>

                <div className="flex items-center gap-4"> {/* Right container */}
                    <span className="text-sm text-muted-foreground hidden sm:inline">
                        Step {currentStep + 1} of {totalSteps}
                    </span>

                    {currentStep < totalSteps - 1 ? (
                        <TooltipProvider>
                            <Tooltip open={showNextButtonTooltip && !isNextDisabled} delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Button onClick={handleNextWithTooltip} disabled={isNextDisabled} className={cn({'animate-pulse': !isNextDisabled})}>
                                        Next
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Click here to continue!</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ) : isStartingJob && jobProgress ? (
                        <JobCreationProgress progress={jobProgress.value} message={jobProgress.message} />
                    ) : (
                        <Button onClick={handleStartJob} disabled={!!filenameError || isStartingJob}>
                            {isStartingJob && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Start Job
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
