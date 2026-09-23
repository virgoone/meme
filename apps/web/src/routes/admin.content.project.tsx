import { createFileRoute } from '@tanstack/react-router';
import { type FormEvent, useMemo, useState } from 'react';

import { DataTableSkeleton } from '@bunship-ai/data-table';

import {
  useAdminProjects,
  useCreateProject,
  useUpdateProject,
  type Project,
  type ProjectInput,
} from '../lib/admin-queries';
import {
  AdminPageHeader,
  type DataTableColumn,
  SimpleDataTable,
  StatCard,
} from '../lib/admin-ui';
import { formatDate } from '../lib/format';

export const Route = createFileRoute('/admin/content/project')({
  component: AdminProjectsPage,
});

const emptyProject: ProjectInput = {
  name: '',
  url: '',
  icon: '',
  description: '',
};

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
        size: 320,
        minSize: 260,
        cell: (project) => (
          <div className='admin-cell-name'>
            {isImageUrl(project.icon) ? (
              <img className='admin-cell-icon' src={project.icon} alt='' />
            ) : (
              <span className='admin-cell-icon admin-cell-icon--text'>
                {project.icon || project.name[0]}
              </span>
            )}
            <span className='admin-project-cell__copy'>
              <strong>{project.name}</strong>
              <small>{project.description || project.url}</small>
            </span>
          </div>
        ),
      },
      {
        id: 'url',
        header: 'URL',
        size: 360,
        minSize: 260,
        cell: (project) => (
          <a
            className='admin-cell-link admin-cell-truncate'
            href={project.url}
            target='_blank'
            rel='noreferrer'
            title={project.url}
          >
            {project.url}
          </a>
        ),
      },
      {
        id: 'created',
        header: 'Created',
        size: 140,
        cell: (project) => formatDate(project.createdAt),
      },
      {
        id: 'actions',
        header: '操作',
        size: 96,
        cell: (project) => (
          <div className='admin-table-actions'>
            <button
              type='button'
              className='admin-row-action is-primary'
              onClick={() => {
                setEditingProject(project);
                setIsCreating(false);
              }}
            >
              编辑
            </button>
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
      updateProject.mutate(
        { id: editingProject.id, values },
        { onSuccess: closeForm },
      );
      return;
    }

    createProject.mutate(values, { onSuccess: closeForm });
  }

  return (
    <section className='admin-page'>
      <AdminPageHeader
        title='项目列表'
        description='公开项目内容管理。'
        action={
          <button
            type='button'
            className='admin-button'
            onClick={() => {
              setEditingProject(null);
              setIsCreating(true);
            }}
          >
            新增项目
          </button>
        }
      />

      {projects.isLoading ? (
        <DataTableSkeleton columnCount={3} rowCount={10} />
      ) : projects.isError ? (
        <p className='admin-error'>
          {projects.error instanceof Error
            ? projects.error.message
            : String(projects.error)}
        </p>
      ) : projects.data ? (
        <>
          <div className='admin-stat-grid'>
            <StatCard title='项目总数' value={projects.data.length} />
            <StatCard
              title='最近创建'
              value={formatDate(projects.data[0]?.createdAt ?? null)}
            />
            <StatCard title='数据源' value='D1' />
          </div>
          <SimpleDataTable
            columns={projectColumns}
            data={projects.data}
            getRowId={(project) => String(project.id)}
          />
          {formProject ? (
            <section className='admin-table-card admin-project-editor'>
              <div className='admin-table-card__header'>
                <div>
                  <h2>{editingProject ? '编辑项目' : '新增项目'}</h2>
                  <p>维护公开项目卡片展示的名称、链接、图标和描述。</p>
                </div>
                <button
                  type='button'
                  className='admin-row-action'
                  onClick={closeForm}
                >
                  关闭
                </button>
              </div>
              <form className='admin-project-form' onSubmit={handleSubmit}>
                <label className='admin-field'>
                  <span>名称</span>
                  <input
                    name='name'
                    defaultValue={formProject.name}
                    required
                    placeholder='项目名称'
                  />
                </label>
                <label className='admin-field'>
                  <span>链接</span>
                  <input
                    name='url'
                    type='url'
                    defaultValue={formProject.url}
                    required
                    placeholder='https://example.com'
                  />
                </label>
                <label className='admin-field'>
                  <span>图标</span>
                  <input
                    name='icon'
                    defaultValue={formProject.icon}
                    required
                    placeholder='图片 URL 或 emoji'
                  />
                </label>
                <label className='admin-field admin-project-form__description'>
                  <span>描述</span>
                  <textarea
                    name='description'
                    defaultValue={formProject.description}
                    placeholder='项目简介'
                  />
                </label>
                <div className='admin-project-form__actions'>
                  {mutation.isError ? (
                    <p className='admin-error'>
                      {mutation.error instanceof Error
                        ? mutation.error.message
                        : String(mutation.error)}
                    </p>
                  ) : null}
                  <button
                    type='button'
                    className='admin-button secondary'
                    onClick={closeForm}
                  >
                    取消
                  </button>
                  <button
                    type='submit'
                    className='admin-button'
                    disabled={mutation.isPending}
                  >
                    {mutation.isPending ? '保存中…' : '保存'}
                  </button>
                </div>
              </form>
            </section>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function isImageUrl(value: string | null | undefined) {
  return Boolean(value && /^https?:\/\//i.test(value));
}
