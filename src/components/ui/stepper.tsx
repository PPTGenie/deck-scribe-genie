
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Step {
  id: string;
  name: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
}

export function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <nav aria-label="Progress">
      <ol role="list" className="space-y-4 md:flex md:space-x-8 md:space-y-0">
        {steps.map((step, stepIdx) => (
          <li key={step.name} className="md:flex-1">
            {stepIdx < currentStep ? (
              // Completed Step
              <div className="group flex w-full items-center gap-x-3 border-l-4 border-primary py-2 transition-colors md:border-l-0 md:border-t-4 md:items-start md:pb-0 md:pt-4 animate-in fade-in duration-200">
                <Check className="h-5 w-5 flex-shrink-0 text-primary" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-primary">{step.id}</span>
                  <span className="text-sm font-medium">{step.name}</span>
                </div>
              </div>
            ) : stepIdx === currentStep ? (
              // Current Step
              <div
                className="flex w-full items-center gap-x-3 border-l-4 border-primary py-2 transition-colors md:border-l-0 md:border-t-4 md:items-start md:border-solid md:pb-0 md:pt-4 animate-in fade-in duration-200"
                aria-current="step"
              >
                <div className="h-5 w-5 flex-shrink-0" /> {/* Spacer */}
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-primary">{step.id}</span>
                  <span className="text-sm font-bold">{step.name}</span>
                </div>
              </div>
            ) : (
              // Upcoming Step
              <div className="group flex w-full items-center gap-x-3 border-l-4 border-gray-200 py-2 transition-colors md:border-l-0 md:border-t-4 md:items-start md:border-dotted md:pb-0 md:pt-4">
                <div className="h-5 w-5 flex-shrink-0" /> {/* Spacer */}
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-muted-foreground">{step.id}</span>
                  <span className="text-sm font-medium text-muted-foreground">{step.name}</span>
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
