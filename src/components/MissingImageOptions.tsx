
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ImageIcon, ImageOff, XCircle } from 'lucide-react';

export type MissingImageBehavior = 'placeholder' | 'skip' | 'fail';

interface MissingImageOptionsProps {
  behavior: MissingImageBehavior;
  onBehaviorChange: (behavior: MissingImageBehavior) => void;
}

export function MissingImageOptions({ behavior, onBehaviorChange }: MissingImageOptionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageOff className="h-5 w-5" />
          Missing Image Handling
        </CardTitle>
        <CardDescription>
          Choose how to handle missing or invalid images during generation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={behavior} onValueChange={onBehaviorChange}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="placeholder" id="placeholder" />
            <Label htmlFor="placeholder" className="flex items-center gap-2 cursor-pointer">
              <ImageIcon className="h-4 w-4" />
              <div>
                <div className="font-medium">Use placeholder image</div>
                <div className="text-sm text-muted-foreground">Insert a "Missing Image" placeholder (recommended)</div>
              </div>
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="skip" id="skip" />
            <Label htmlFor="skip" className="flex items-center gap-2 cursor-pointer">
              <ImageOff className="h-4 w-4" />
              <div>
                <div className="font-medium">Skip missing images</div>
                <div className="text-sm text-muted-foreground">Leave image placeholders empty</div>
              </div>
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="fail" id="fail" />
            <Label htmlFor="fail" className="flex items-center gap-2 cursor-pointer">
              <XCircle className="h-4 w-4" />
              <div>
                <div className="font-medium">Fail job on missing images</div>
                <div className="text-sm text-muted-foreground">Stop processing if any image is missing</div>
              </div>
            </Label>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
