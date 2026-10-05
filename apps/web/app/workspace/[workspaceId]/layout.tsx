import { auth } from '@/auth';
import { AppShell } from '@/components/shell';

export const metadata = {
  title: 'Architecture Studio — DiagramHQ',
  description: 'DiagramHQ Architecture Studio',
};

export interface WorkspaceLayoutProps {
  children: React.ReactNode;
  params: {
    workspaceId: string;
  };
}

export default async function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps): Promise<JSX.Element> {
  const session = await auth();

  return (
    <AppShell workspaceId={params.workspaceId} user={session?.user}>
      {children}
    </AppShell>
  );
}
