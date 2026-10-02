'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createOrganizationAction, type ActionState } from './actions';
import { useEffect, useRef } from 'react';

function SubmitButton(): JSX.Element {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="form-button-primary"
    >
      {pending ? 'Creating...' : 'Create Organization'}
    </button>
  );
}

export function CreateOrgForm(): JSX.Element {
  const [state, formAction] = useFormState<ActionState, FormData>(createOrganizationAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success && formRef.current) {
      formRef.current.reset();
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4 max-w-md">
      {state.error && (
        <div role="alert" className="form-alert-error">
          {state.error}
        </div>
      )}

      {state.success && (
        <div role="status" className="form-alert-success">
          Organization created successfully!
        </div>
      )}

      <div>
        <label htmlFor="name" className="form-label">
          Organization Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={64}
          placeholder="e.g. Acme Corp"
          className="form-input"
        />
      </div>

      <div>
        <label htmlFor="slug" className="form-label">
          Slug <span className="text-gray-400 font-normal lowercase">(optional)</span>
        </label>
        <input
          id="slug"
          name="slug"
          type="text"
          maxLength={64}
          placeholder="e.g. acme-corp"
          className="form-input"
        />
      </div>

      <div className="pt-1">
        <SubmitButton />
      </div>
    </form>
  );
}
