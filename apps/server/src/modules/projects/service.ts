import { createD1Database, project } from '@meme/db';
import { desc, eq } from 'drizzle-orm';

import type { WorkerEnv } from '../../env';

export type ProjectInput = {
  name?: string;
  url?: string;
  icon?: string;
  description?: string;
};

function parseId(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw new Error('Invalid project id');
  return id;
}

function validateProjectInput(input: ProjectInput, partial = false) {
  const name = input.name?.trim();
  const url = input.url?.trim();
  const icon = input.icon?.trim();
  const description = input.description?.trim() ?? '';

  if (!partial || name !== undefined) {
    if (!name) throw new Error('name is required');
  }
  if (!partial || url !== undefined) {
    if (!url) throw new Error('url is required');
    new URL(url);
  }
  if (!partial || icon !== undefined) {
    if (!icon) throw new Error('icon is required');
  }

  return { name, url, icon, description };
}

function validateNewProjectInput(input: ProjectInput) {
  const values = validateProjectInput(input);
  if (!values.name || !values.url || !values.icon) {
    throw new Error('name, url, and icon are required');
  }
  return {
    name: values.name,
    url: values.url,
    icon: values.icon,
    description: values.description,
  };
}

export async function listProjects(env: WorkerEnv, limit = 200) {
  const db = createD1Database(env.DB);

  return db
    .select()
    .from(project)
    .orderBy(desc(project.createdAt))
    .limit(Math.min(Math.max(limit, 1), 200));
}

export async function createProject(env: WorkerEnv, input: ProjectInput) {
  const values = validateNewProjectInput(input);
  const db = createD1Database(env.DB);
  const [created] = await db
    .insert(project)
    .values({
      name: values.name,
      url: values.url,
      icon: values.icon,
      description: values.description,
    })
    .returning();

  return created;
}

export async function updateProject(
  env: WorkerEnv,
  idValue: string,
  input: ProjectInput,
) {
  const id = parseId(idValue);
  const values = validateProjectInput(input, true);
  const updateValues: Partial<typeof project.$inferInsert> = {};
  if (values.name !== undefined) updateValues.name = values.name;
  if (values.url !== undefined) updateValues.url = values.url;
  if (values.icon !== undefined) updateValues.icon = values.icon;
  if (input.description !== undefined) {
    updateValues.description = values.description;
  }

  if (Object.keys(updateValues).length === 0) {
    throw new Error('No project fields to update');
  }

  const db = createD1Database(env.DB);
  const [updated] = await db
    .update(project)
    .set(updateValues)
    .where(eq(project.id, id))
    .returning();

  return updated ?? null;
}

export async function deleteProject(env: WorkerEnv, idValue: string) {
  const id = parseId(idValue);
  const db = createD1Database(env.DB);
  const [deleted] = await db
    .delete(project)
    .where(eq(project.id, id))
    .returning();

  return deleted ?? null;
}
