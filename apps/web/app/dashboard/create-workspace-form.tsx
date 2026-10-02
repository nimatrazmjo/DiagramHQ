'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createWorkspaceAction, type ActionState } from './workspace-actions';
import { canRoleWrite } from './role-badge';
import { useEffect, useRef } from 'react';

function SubmitButton(): JSX.Element {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="form-button-primary-sm"
    >
      {pending ? 'Creating...' : 'Create Workspace'}
    </button>
  );
}

export interface CreateWorkspaceFormProps {
  orgId: string;
  userRole?: string;
}

export function CreateWorkspaceForm({ orgId, userRole }: CreateWorkspaceFormProps): JSX.Element {
  const isReadOnly = Boolean(userRole && !canRoleWrite(userRole));
  const createWorkspaceWithOrg = createWorkspaceAction.bind(null, orgId);
  const [state, formAction] = useFormState<ActionState, FormData>(createWorkspaceWithOrg, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success && formRef.current) {
      formRef.current.reset();
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={isReadOnly ? undefined : formAction} className="flex flex-col gap-3 max-w-sm">
      <input type="hidden" name="orgId" value={orgId} />
      {state.error && (
        <div role="alert" className="form-alert-error">
          {state.error}
        </div>
      )}

      {state.success && (
        <div role="status" className="form-alert-success">
          Workspace created successfully!
        </div>
      )}

      <div>
        <label htmlFor={`workspace-name-${orgId}`} className="form-label">
          Workspace Name
        </label>
        <input
          id={`workspace-name-${orgId}`}
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={64}
          disabled={isReadOnly}
          placeholder="e.g. Core Banking Platform"
          className="form-input-sm"
        />
      </div>

      <div>
        <label htmlFor={`workspace-slug-${orgId}`} className="form-label">
          Slug <span className="text-gray-400 font-normal lowercase">(optional)</span>
        </label>
        <input
          id={`workspace-slug-${orgId}`}
          name="slug"
          type="text"
          maxLength={64}
          disabled={isReadOnly}
          placeholder="e.g. core-banking"
          className="form-input-sm"
        />
      </div>

      <div className="pt-1">
        {isReadOnly ? (
          <div role="status" className="p-2 text-xs text-gray-600 bg-gray-100 border border-gray-200 rounded">
            Viewers have read-only access and cannot create workspaces.
          </div>
        ) : (
          <SubmitButton />
        )}
      </div>
    </form>
  );
}

export default CreateWorkspaceForm;
