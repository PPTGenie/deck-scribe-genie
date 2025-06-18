
import React from 'react';

export function ContentContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-4xl mx-auto px-6 sm:px-8 lg:px-10">
      {children}
    </div>
  );
}
