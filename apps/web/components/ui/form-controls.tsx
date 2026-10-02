import React, { forwardRef, type InputHTMLAttributes, type LabelHTMLAttributes } from 'react';

export interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  inputSize?: 'sm' | 'md';
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ className = '', inputSize = 'md', ...props }, ref) => {
    const sizeClass = inputSize === 'sm' ? 'form-input-sm' : 'form-input';
    return (
      <input
        ref={ref}
        className={`${sizeClass} ${className}`}
        {...props}
      />
    );
  },
);
FormInput.displayName = 'FormInput';

export interface FormLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  optional?: boolean;
}

export const FormLabel = ({
  children,
  optional,
  className = '',
  ...props
}: FormLabelProps): JSX.Element => (
  <label className={`form-label ${className}`} {...props}>
    {children}
    {optional && <span className="text-gray-400 font-normal lowercase ml-1">(optional)</span>}
  </label>
);
