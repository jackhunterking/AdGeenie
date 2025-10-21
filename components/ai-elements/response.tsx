'use client';

import { cn } from '@/lib/utils';
import { memo, type HTMLAttributes } from 'react';
import { Streamdown } from 'streamdown';

export type ResponseProps = HTMLAttributes<HTMLDivElement> & {
  children: string;
  isAnimating?: boolean;
};

const ResponseComponent = ({
  className,
  children,
  isAnimating = false,
  ...props
}: ResponseProps) => {
  return (
    <div
      className={cn(
        'size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
        className,
      )}
      {...props}
    >
      <Streamdown isAnimating={isAnimating}>
        {children}
      </Streamdown>
    </div>
  );
};

ResponseComponent.displayName = 'ResponseComponent';

export const Response = memo(
  ResponseComponent,
  (prevProps, nextProps) => 
    prevProps.children === nextProps.children && 
    prevProps.isAnimating === nextProps.isAnimating
);
