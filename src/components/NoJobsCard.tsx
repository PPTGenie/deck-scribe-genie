
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function NoJobsCard() {
  return (
    <Card className="shadow-lg border-slate-200/60 bg-white/90 backdrop-blur-sm">
      <CardHeader className="pb-6 px-8 pt-8">
        <CardTitle className="text-2xl font-semibold text-slate-800">No Jobs Found</CardTitle>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        <p className="text-lg text-slate-600 leading-relaxed">
          You haven't created any batch jobs yet. Click "New Batch" to get started.
        </p>
      </CardContent>
    </Card>
  );
}
