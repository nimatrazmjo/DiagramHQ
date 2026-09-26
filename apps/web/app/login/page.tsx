import { Suspense } from 'react';
import { LoginForm } from './login-form';

export const metadata = {
  title: 'Sign In — DiagramHQ',
  description: 'Sign in to access your DiagramHQ architectures and workspaces',
};

export default function LoginPage(): JSX.Element {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md flex flex-col items-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign in to DiagramHQ</h1>
        <p className="text-sm text-gray-600 mb-6 text-center">
          Enter your email and password to access your architecture workspace.
        </p>
        <Suspense fallback={<div>Loading sign-in form...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
