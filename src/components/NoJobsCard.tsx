
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function NoJobsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>No Jobs Found</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          You haven't created any batch jobs yet. Click "New Batch" to get started.
        </p>
      </CardContent>
    </Card>
  );
}
