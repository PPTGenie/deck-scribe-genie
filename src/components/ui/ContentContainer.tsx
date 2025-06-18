
import React from 'react';

export function ContentContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  );
}
