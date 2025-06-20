
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface MissingImageOptionsProps {
  missingImageBehavior: string;
  setMissingImageBehavior: (behavior: string) => void;
}

export function MissingImageOptions({
  missingImageBehavior,
  setMissingImageBehavior
}: MissingImageOptionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Missing Image Handling</CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup value={missingImageBehavior} onValueChange={setMissingImageBehavior}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="fail" id="fail" />
            <Label htmlFor="fail" className="flex-1">
              <div className="font-medium">Fail job if images are missing</div>
              <div className="text-sm text-muted-foreground">
                Stop processing and report an error when any required image is not found
              </div>
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="placeholder" id="placeholder" />
            <Label htmlFor="placeholder" className="flex-1">
              <div className="font-medium">Use placeholder for missing images</div>
              <div className="text-sm text-muted-foreground">
                Replace missing images with a "Missing Image" placeholder
              </div>
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="skip" id="skip" />
            <Label htmlFor="skip" className="flex-1">
              <div className="font-medium">Skip missing images</div>
              <div className="text-sm text-muted-foreground">
                Leave image placeholders empty when images are not found
              </div>
            </Label>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
