import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stepper } from '@/components/ui/stepper';
import { UploadTemplateStep } from '@/components/UploadTemplateStep';
import { UploadCSVStep } from '@/components/UploadCSVStep';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { ConfirmStep } from './ConfirmStep';

const steps = [
  { id: 'Step 1', name: 'Upload Template', description: 'Select your .pptx file with placeholders.' },
  { id: 'Step 2', name: 'Upload CSV', description: 'Provide the data for generation.' },
  { id: 'Step 3', name: 'Confirm & Start', description: 'Review your files and start the job.' },
];

export function NewBatchFlow() {
  const [currentStep, setCurrentStep] = useState(0); // Start at step 1
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null); // No default error
  const [extractedVariables, setExtractedVariables] = useState<string[] | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [csvPreview, setCsvPreview] = useState<{ headers: string[]; data: Record<string, string>[] } | null>(null);
  const [missingVariables, setMissingVariables] = useState<string[]>([]);
  const [isStartingJob, setIsStartingJob] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  // When template file is cleared, also clear extracted variables and csv data.
  React.useEffect(() => {
    if (!templateFile) {
        setExtractedVariables(null);
        setCsvFile(null);
        setCsvPreview(null);
        setMissingVariables([]);
    }
  }, [templateFile]);
  
  // Recalculate missing variables when template variables or CSV headers change
  React.useEffect(() => {
    if (extractedVariables && csvPreview?.headers) {
      const missing = extractedVariables.filter(v => !csvPreview.headers.includes(v));
      setMissingVariables(missing);
    } else {
      setMissingVariables([]);
    }
  }, [extractedVariables, csvPreview]);

  const goToNextStep = () => {
    if (currentStep < steps.length - 1) {
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

  let isNextDisabled = false;
  if (currentStep === 0) {
    isNextDisabled = !templateFile || !!error || isExtracting;
  } else if (currentStep === 1) {
    isNextDisabled = !csvFile || !!error || !csvPreview || missingVariables.length > 0;
  }

  const handleStartJob = async () => {
    if (!templateFile || !csvFile || !user || !csvPreview) {
      toast.error("Missing required files or user session. Please start over.");
      return;
    }

    setIsStartingJob(true);
    const jobToast = toast.loading("Queuing your batch job...");

    try {
      // 1. Upload Template
      const templateExt = templateFile.name.split('.').pop() || 'pptx';
      const templateFileName = `${crypto.randomUUID()}.${templateExt}`;
      const templatePath = `${user.id}/${templateFileName}`;
      
      const { error: templateUploadError } = await supabase.storage
        .from('templates')
        .upload(templatePath, templateFile);

      if (templateUploadError) throw new Error(`Template upload failed: ${templateUploadError.message}`);

      // 2. Insert Template record
      const { data: templateData, error: templateInsertError } = await supabase
        .from('templates')
        .insert({ user_id: user.id, filename: templateFile.name, storage_path: templatePath })
        .select('id')
        .single();

      if (templateInsertError) throw new Error(`Failed to save template record: ${templateInsertError.message}`);
      if (!templateData) throw new Error("Could not retrieve template ID after insert.");

      // 3. Upload CSV
      const csvExt = csvFile.name.split('.').pop() || 'csv';
      const csvFileName = `${crypto.randomUUID()}.${csvExt}`;
      const csvPath = `${user.id}/${csvFileName}`;
      
      const { error: csvUploadError } = await supabase.storage
        .from('csv_files')
        .upload(csvPath, csvFile);

      if (csvUploadError) throw new Error(`CSV upload failed: ${csvUploadError.message}`);

      // 4. Insert CSV record
      const { data: csvData, error: csvInsertError } = await supabase
        .from('csv_uploads')
        .insert({
          user_id: user.id,
          template_id: templateData.id,
          rows_count: csvPreview.data.length,
          storage_path: csvPath,
        })
        .select('id')
        .single();

      if (csvInsertError) throw new Error(`Failed to save CSV record: ${csvInsertError.message}`);
      if (!csvData) throw new Error("Could not retrieve CSV upload ID after insert.");

      // 5. Insert Job record
      const { error: jobInsertError } = await supabase
        .from('jobs')
        .insert({ user_id: user.id, template_id: templateData.id, csv_id: csvData.id });

      if (jobInsertError) throw new Error(`Failed to create job record: ${jobInsertError.message}`);

      // 6. Trigger edge function to start processing immediately.
      // We don't await this so it doesn't block the UI. If it fails,
      // the scheduled task will pick up the job later.
      supabase.functions.invoke('process-presentation-jobs').catch(err => {
        console.error("Error triggering job processing immediately:", err);
      });

      toast.success("Job successfully queued! Redirecting to dashboard...", { id: jobToast, duration: 3000 });
      setTimeout(() => navigate('/dashboard'), 2000);

    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred.", { id: jobToast });
    } finally {
      setIsStartingJob(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Stepper steps={steps.map(s => ({ id: s.id, name: s.name }))} currentStep={currentStep} />
      <Card className={cn("transition-all", error && "border-destructive ring-1 ring-destructive/50")}>
        <CardHeader>
          <CardTitle>{steps[currentStep].name}</CardTitle>
          <CardDescription>{steps[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {currentStep === 0 && (
            <UploadTemplateStep
              templateFile={templateFile}
              setTemplateFile={setTemplateFile}
              error={error}
              setError={setError}
              extractedVariables={extractedVariables}
              setExtractedVariables={setExtractedVariables}
              isExtracting={isExtracting}
              setIsExtracting={setIsExtracting}
            />
          )}
          {currentStep === 1 && (
            <UploadCSVStep
              csvFile={csvFile}
              setCsvFile={setCsvFile}
              error={error}
              setError={setError}
              extractedVariables={extractedVariables}
              csvPreview={csvPreview}
              setCsvPreview={setCsvPreview}
              missingVariables={missingVariables}
            />
          )}
          {currentStep === 2 && templateFile && csvFile && csvPreview && (
            <ConfirmStep 
              templateFile={templateFile} 
              csvFile={csvFile} 
              csvPreview={csvPreview} 
            />
          )}
        </CardContent>
      </Card>
      
      <div className="flex w-full items-center justify-between pt-4">
        {currentStep > 0 ? (
          <Button variant="outline" onClick={goToPrevStep} disabled={isStartingJob}>
            Back
          </Button>
        ) : <div />}

        {currentStep < steps.length - 1 ? (
          <Button onClick={goToNextStep} disabled={isNextDisabled}>
            Next
          </Button>
        ) : (
          <Button onClick={handleStartJob} disabled={isStartingJob}>
            {isStartingJob && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start Job
          </Button>
        )}
      </div>

    </div>
  );
}
