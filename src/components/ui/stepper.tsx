
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
              <div className="group flex w-full items-start gap-x-3 border-l-4 border-primary py-2 pl-4 transition-colors md:flex-col md:gap-x-0 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 flex-shrink-0 text-primary" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-primary">{step.id}</span>
                    <span className="text-sm font-medium">{step.name}</span>
                  </div>
                </div>
              </div>
            ) : stepIdx === currentStep ? (
              // Current Step
              <div
                className="flex w-full flex-col border-l-4 border-primary py-2 pl-4 transition-colors md:border-l-0 md:border-t-4 md:border-solid md:pb-0 md:pl-0 md:pt-4 animate-in fade-in duration-200"
                aria-current="step"
              >
                <span className="text-sm font-medium text-primary">{step.id}</span>
                <span className="text-sm font-bold">{step.name}</span>
              </div>
            ) : (
              // Upcoming Step
              <div className="group flex w-full flex-col border-l-4 border-gray-200 py-2 pl-4 transition-colors md:border-l-0 md:border-t-4 md:border-dotted md:pb-0 md:pl-0 md:pt-4">
                <span className="text-sm font-medium text-muted-foreground">{step.id}</span>
                <span className="text-sm font-medium text-muted-foreground">{step.name}</span>
              </div>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
