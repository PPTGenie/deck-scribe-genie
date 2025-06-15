
import { useState } from 'react';

export function useStepNavigation(maxSteps: number, setError: (error: string | null) => void) {
  const [currentStep, setCurrentStep] = useState(0);

  const goToNextStep = () => {
    if (currentStep < maxSteps - 1) {
      setCurrentStep(currentStep + 1);
      setError(null);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };
  
  return {
    currentStep,
    goToNextStep,
    goToPrevStep,
  };
}
