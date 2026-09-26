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
      className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded shadow transition-colors disabled:opacity-50"
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
    <form ref={formRef} action={formAction} className="flex flex-col gap-3 max-w-md">
      {state.error && (
        <div role="alert" className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
          {state.error}
        </div>
      )}

      {state.success && (
        <div role="status" className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded">
          Organization created successfully!
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-xs font-semibold text-gray-700 uppercase mb-1">
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
          className="w-full px-3 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="slug" className="block text-xs font-semibold text-gray-700 uppercase mb-1">
          Slug <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          id="slug"
          name="slug"
          type="text"
          maxLength={64}
          placeholder="e.g. acme-corp"
          className="w-full px-3 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="pt-1">
        <SubmitButton />
      </div>
    </form>
  );
}
