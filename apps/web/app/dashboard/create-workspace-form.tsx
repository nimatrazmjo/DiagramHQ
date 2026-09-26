'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createWorkspaceAction, type ActionState } from './workspace-actions';
import { useEffect, useRef } from 'react';

function SubmitButton(): JSX.Element {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded shadow transition-colors disabled:opacity-50"
    >
      {pending ? 'Creating...' : 'Create Workspace'}
    </button>
  );
}

export interface CreateWorkspaceFormProps {
  orgId: string;
}

export function CreateWorkspaceForm({ orgId }: CreateWorkspaceFormProps): JSX.Element {
  const createWorkspaceWithOrg = createWorkspaceAction.bind(null, orgId);
  const [state, formAction] = useFormState<ActionState, FormData>(createWorkspaceWithOrg, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success && formRef.current) {
      formRef.current.reset();
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2 max-w-sm">
      <input type="hidden" name="orgId" value={orgId} />
      {state.error && (
        <div role="alert" className="p-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded">
          {state.error}
        </div>
      )}

      {state.success && (
        <div role="status" className="p-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded">
          Workspace created successfully!
        </div>
      )}

      <div>
        <label htmlFor={`workspace-name-${orgId}`} className="block text-xs font-semibold text-gray-700 uppercase mb-1">
          Workspace Name
        </label>
        <input
          id={`workspace-name-${orgId}`}
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={64}
          placeholder="e.g. Core Banking Platform"
          className="w-full px-2.5 py-1 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor={`workspace-slug-${orgId}`} className="block text-xs font-semibold text-gray-700 uppercase mb-1">
          Slug <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          id={`workspace-slug-${orgId}`}
          name="slug"
          type="text"
          maxLength={64}
          placeholder="e.g. core-banking"
          className="w-full px-2.5 py-1 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="pt-1">
        <SubmitButton />
      </div>
    </form>
  );
}

export default CreateWorkspaceForm;
