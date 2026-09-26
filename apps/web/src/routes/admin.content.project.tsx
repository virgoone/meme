import { createFileRoute } from '@tanstack/react-router';
import { Plus, X } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';

import { DataTableSkeleton } from '@bunship-ai/data-table';
import { Button } from '@bunship-ai/ui/components/button';
import { Input } from '@bunship-ai/ui/components/input';
import { Label } from '@bunship-ai/ui/components/label';
import { Textarea } from '@bunship-ai/ui/components/textarea';

import { useAdminProjects, useCreateProject, useUpdateProject, type Project, type ProjectInput } from '../lib/admin-queries';
import { AdminPage, AdminPageHeader, type DataTableColumn, ErrorText, SectionCard, SimpleDataTable, StatCard, StatGrid } from '../lib/admin-ui';
import { formatDate } from '../lib/format';

export const Route = createFileRoute('/admin/content/project')({
  component: AdminProjectsPage,
});

const emptyProject: ProjectInput = { name: '', url: '', icon: '', description: '' };

function AdminProjectsPage() {
  const projects = useAdminProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const projectColumns = useMemo<DataTableColumn<Project>[]>(
    () => [
      {
        id: 'name',
        header: '项目',
        size: 340,
        minSize: 260,
        cell: (project) => (
          <div className='flex min-w-0 items-center gap-3'>
            {isImageUrl(project.icon) ? (
              <img className='size-8 shrink-0 rounded border border-border bg-muted object-cover' src={project.icon} alt='' />
            ) : (
              <span className='grid size-8 shrink-0 place-items-center rounded border border-border bg-muted text-sm'>{project.icon || project.name[0]}</span>
            )}
            <span className='grid min-w-0 gap-0.5'>
              <strong className='truncate font-medium text-sm'>{project.name}</strong>
              <small className='truncate text-muted-foreground text-xs'>{project.description || project.url}</small>
            </span>
          </div>
        ),
      },
      {
        id: 'url',
        header: '链接',
        size: 340,
        minSize: 240,
        cell: (project) => (
          <a className='block max-w-full truncate text-muted-foreground text-sm hover:text-foreground hover:underline' href={project.url} target='_blank' rel='noreferrer' title={project.url}>
            {project.url}
          </a>
        ),
      },
      {
        id: 'created',
        header: '创建时间',
        size: 150,
        cell: (project) => <span className='text-muted-foreground text-sm'>{formatDate(project.createdAt)}</span>,
      },
      {
        id: 'actions',
        header: '',
        size: 90,
        cell: (project) => (
          <div className='flex justify-end'>
            <Button type='button' variant='outline' size='sm' onClick={() => { setEditingProject(project); setIsCreating(false); }}>
              编辑
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const formProject = editingProject ?? (isCreating ? emptyProject : null);
  const mutation = editingProject ? updateProject : createProject;

  function closeForm() {
    setEditingProject(null);
    setIsCreating(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values: ProjectInput = {
      name: String(form.get('name') ?? '').trim(),
      url: String(form.get('url') ?? '').trim(),
      icon: String(form.get('icon') ?? '').trim(),
      description: String(form.get('description') ?? '').trim(),
    };
    if (editingProject) {
      updateProject.mutate({ id: editingProject.id, values }, { onSuccess: closeForm });
      return;
    }
    createProject.mutate(values, { onSuccess: closeForm });
  }

  return (
    <AdminPage>
      <AdminPageHeader
        title='项目'
        description='前台项目页展示的作品与工具。'
        action={
          <Button type='button' onClick={() => { setEditingProject(null); setIsCreating(true); }}>
            <Plus aria-hidden='true' />新增项目
          </Button>
        }
      />

      {projects.isPending ? (
        <DataTableSkeleton columnCount={3} rowCount={6} />
      ) : projects.isError ? (
        <ErrorText error={projects.error} />
      ) : projects.data ? (
        <>
          {formProject ? (
            <SectionCard
              title={editingProject ? '编辑项目' : '新增项目'}
              description='名称、链接、图标和描述会直接展示在前台项目卡片上。'
              action={<Button type='button' variant='ghost' size='icon' className='size-8' aria-label='关闭' onClick={closeForm}><X aria-hidden='true' /></Button>}
            >
              <form key={editingProject?.id ?? 'new'} className='grid gap-4 md:grid-cols-2' onSubmit={handleSubmit}>
                <div className='grid gap-1.5'>
                  <Label htmlFor='project-name' className='text-muted-foreground text-xs'>名称</Label>
                  <Input id='project-name' name='name' defaultValue={formProject.name} required placeholder='项目名称' />
                </div>
                <div className='grid gap-1.5'>
                  <Label htmlFor='project-url' className='text-muted-foreground text-xs'>链接</Label>
                  <Input id='project-url' name='url' type='url' defaultValue={formProject.url} required placeholder='https://example.com' />
                </div>
                <div className='grid gap-1.5'>
                  <Label htmlFor='project-icon' className='text-muted-foreground text-xs'>图标</Label>
                  <Input id='project-icon' name='icon' defaultValue={formProject.icon} required placeholder='图片 URL 或 emoji' />
                </div>
                <div className='grid gap-1.5 md:col-span-2'>
                  <Label htmlFor='project-description' className='text-muted-foreground text-xs'>描述</Label>
                  <Textarea id='project-description' name='description' defaultValue={formProject.description} rows={3} placeholder='项目简介' />
                </div>
                <div className='flex items-center justify-end gap-2 md:col-span-2'>
                  {mutation.isError ? <ErrorText error={mutation.error} className='mr-auto text-xs' /> : null}
                  <Button type='button' variant='outline' onClick={closeForm}>取消</Button>
                  <Button type='submit' disabled={mutation.isPending}>{mutation.isPending ? '保存中…' : '保存'}</Button>
                </div>
              </form>
            </SectionCard>
          ) : null}

          <StatGrid>
            <StatCard title='项目总数' value={projects.data.length} />
            <StatCard title='最近创建' value={formatDate(projects.data[0]?.createdAt ?? null)} />
          </StatGrid>

          <SimpleDataTable columns={projectColumns} data={projects.data} getRowId={(project) => String(project.id)} />
        </>
      ) : null}
    </AdminPage>
  );
}

function isImageUrl(value: string | null | undefined) {
  return Boolean(value && /^https?:\/\//i.test(value));
}
