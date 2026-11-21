import { createFileRoute } from '@tanstack/react-router';
import { FolderKanban, Pencil, Plus, X } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';

import { type Project, type ProjectInput, useAdminProjects, useCreateProject, useUpdateProject } from '../lib/admin-queries';
import { AdminPage, AdminPageHeader, ErrorText, SectionCard, StatCard, StatGrid } from '../lib/admin-ui';
import { formatDate } from '../lib/format';
import { type Column, DataTable, TableSkeleton } from '../lib/sluice/data-table';
import { ListToolbar, matches, PageFooter, paginate, SearchBox, useUrlList } from '../lib/sluice/list-controls';
import { Button, EmptyState, Field, Input, TableCard, Textarea } from '../lib/sluice/ui';

export const Route = createFileRoute('/admin/content/project')({
  component: AdminProjectsPage,
});

const emptyProject: ProjectInput = { name: '', url: '', icon: '', description: '' };
const PROJECT_KEYS = [] as const;

function AdminProjectsPage() {
  const projects = useAdminProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { state, set } = useUrlList(PROJECT_KEYS);

  const projectColumns = useMemo<Column<Project>[]>(
    () => [
      {
        id: 'name',
        header: '项目',
        className: 'max-w-[240px] sm:max-w-sm',
        cell: (project) => (
          <div className='flex min-w-0 items-center gap-3'>
            {isImageUrl(project.icon) ? (
              <img className='size-8 shrink-0 rounded-ui-sm border border-border-light bg-fill-weak object-cover' src={project.icon} alt='' />
            ) : (
              <span className='grid size-8 shrink-0 place-items-center rounded-ui-sm border border-border-light bg-fill-weak type-sm text-subtitle'>{project.icon || project.name[0]}</span>
            )}
            <span className='grid min-w-0 gap-0.5'>
              <span className='truncate font-medium text-title'>{project.name}</span>
              <span className='truncate font-desc text-description type-sm'>{project.description || project.url}</span>
            </span>
          </div>
        ),
      },
      {
        id: 'url',
        header: '链接',
        hideOnMobile: true,
        className: 'max-w-[280px]',
        cell: (project) => (
          <a className='block max-w-full truncate font-code text-description type-sm hover:text-title hover:underline' href={project.url} target='_blank' rel='noreferrer' title={project.url}>
            {project.url}
          </a>
        ),
      },
      {
        id: 'created',
        header: '创建时间',
        hideOnMobile: true,
        cell: (project) => <span className='whitespace-nowrap text-description type-sm'>{formatDate(project.createdAt)}</span>,
      },
      {
        id: 'actions',
        header: <span className='sr-only'>操作</span>,
        cell: (project) => (
          <div className='flex justify-end gap-1'>
            <Button type='button' size='icon-sm' variant='ghost' aria-label={`编辑 ${project.name}`} onClick={() => openEdit(project)}>
              <Pencil aria-hidden='true' />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const formProject = editingProject ?? (isCreating ? emptyProject : null);
  const mutation = editingProject ? updateProject : createProject;

  function openEdit(project: Project) {
    setEditingProject(project);
    setIsCreating(false);
  }

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

  const all = projects.data ?? [];
  const filtered = all.filter((project) => matches(state.q, project.name, project.description, project.url));
  const slice = paginate(filtered, state.page, state.size);

  return (
    <AdminPage>
      <AdminPageHeader
        title='项目'
        description='前台项目页展示的作品与工具。'
        action={
          <Button type='button' variant='primary' onClick={() => { setEditingProject(null); setIsCreating(true); }}>
            <Plus aria-hidden='true' />新增项目
          </Button>
        }
      />

      {projects.isPending ? (
        <TableCard>
          <TableSkeleton rows={5} cols={3} />
        </TableCard>
      ) : projects.isError ? (
        <ErrorText error={projects.error} />
      ) : projects.data ? (
        <>
          {formProject ? (
            <SectionCard
              title={editingProject ? '编辑项目' : '新增项目'}
              description='名称、链接、图标和描述会直接展示在前台项目卡片上。'
              action={<Button type='button' variant='ghost' size='icon-sm' aria-label='关闭' onClick={closeForm}><X aria-hidden='true' /></Button>}
            >
              <form key={editingProject?.id ?? 'new'} className='grid gap-4 md:grid-cols-2' onSubmit={handleSubmit}>
                <Field label='名称' htmlFor='project-name'>
                  <Input id='project-name' name='name' defaultValue={formProject.name} required placeholder='项目名称' />
                </Field>
                <Field label='链接' htmlFor='project-url'>
                  <Input id='project-url' name='url' type='url' defaultValue={formProject.url} required placeholder='https://example.com' />
                </Field>
                <Field label='图标' htmlFor='project-icon'>
                  <Input id='project-icon' name='icon' defaultValue={formProject.icon} required placeholder='图片 URL 或 emoji' />
                </Field>
                <Field label='描述' htmlFor='project-description' className='md:col-span-2'>
                  <Textarea id='project-description' name='description' defaultValue={formProject.description} rows={3} placeholder='项目简介' />
                </Field>
                <div className='flex flex-wrap items-center justify-end gap-2 md:col-span-2'>
                  {mutation.isError ? <ErrorText error={mutation.error} className='mr-auto type-sm' /> : null}
                  <Button type='button' variant='outline' onClick={closeForm}>取消</Button>
                  <Button type='submit' variant='primary' loading={mutation.isPending}>{mutation.isPending ? '保存中…' : '保存'}</Button>
                </div>
              </form>
            </SectionCard>
          ) : null}

          <StatGrid>
            <StatCard title='项目总数' value={projects.data.length} />
            <StatCard title='最近创建' value={formatDate(projects.data[0]?.createdAt ?? null)} />
          </StatGrid>

          <TableCard>
            {all.length > 0 ? (
              <ListToolbar className='border-border-light border-b p-2 sm:px-3'>
                <SearchBox value={state.q} onChange={(q) => set({ q })} placeholder='搜索名称、描述或链接' />
              </ListToolbar>
            ) : null}
            {all.length === 0 ? (
              <EmptyState icon={FolderKanban} title='还没有项目' body='前台项目页展示的作品与工具会出现在这里。' />
            ) : filtered.length === 0 ? (
              <EmptyState icon={FolderKanban} title='没有匹配的项目' action={<Button size='sm' onClick={() => set({ q: '' })}>清除筛选</Button>} />
            ) : (
              <>
                <DataTable columns={projectColumns} data={slice.rows} getRowId={(project) => String(project.id)} onRowClick={openEdit} caption='项目' />
                <PageFooter slice={slice} onPage={(page) => set({ page })} onSize={(size) => set({ size })} />
              </>
            )}
          </TableCard>
        </>
      ) : null}
    </AdminPage>
  );
}

function isImageUrl(value: string | null | undefined) {
  return Boolean(value && /^https?:\/\//i.test(value));
}
