
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Step {
    id: string;
    name: string;
    description: string;
}

interface StepCardProps {
    step: Step;
    hasError: boolean;
    children: React.ReactNode;
}

export function StepCard({ step, hasError, children }: StepCardProps) {
    return (
        <Card className={cn("transition-all", hasError && "border-destructive ring-1 ring-destructive/50")}>
            <CardHeader>
                <CardTitle>{step.name}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
            </CardHeader>
            <CardContent>
                {children}
            </CardContent>
        </Card>
    );
}
