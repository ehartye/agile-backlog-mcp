import type { AgileDatabase, ProjectContext } from '@agile-mcp/shared';

export class ProjectContextError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ProjectContextError';
  }
}

export function getProjectContext(
  db: AgileDatabase,
  projectIdentifier: string,
  userId: string
): ProjectContext {
  // Try to find a project that matches this identifier
  const project = db.getProjectByIdentifier(projectIdentifier);

  if (!project) {
    // Log security event
    db.logSecurityEvent(
      'unauthorized_access',
      projectIdentifier,
      'project',
      `Attempted to access unregistered project: ${projectIdentifier}`,
      null,
      null,
      userId
    );

    throw new ProjectContextError(
      `No project registered with identifier: ${projectIdentifier}. Please register this project first using register_project.`,
      'PROJECT_NOT_REGISTERED'
    );
  }

  return {
    project_identifier: projectIdentifier,
    project_id: project.id,
    project_name: project.name,
    user_id: userId,
  };
}

export function validateProjectAccess(
  db: AgileDatabase,
  projectContext: ProjectContext,
  entityType: 'epic' | 'story' | 'task' | 'bug',
  entityId: number
): void {
  let actualProjectId: number | null = null;

  switch (entityType) {
    case 'epic':
      actualProjectId = db.getProjectIdForEpic(entityId);
      break;
    case 'story':
      actualProjectId = db.getProjectIdForStory(entityId);
      break;
    case 'task':
      actualProjectId = db.getProjectIdForTask(entityId);
      break;
    case 'bug':
      actualProjectId = db.getProjectIdForBug(entityId);
      break;
  }

  if (actualProjectId !== projectContext.project_id) {
    // Log security violation
    db.logSecurityEvent(
      'project_violation',
      projectContext.project_identifier,
      entityType,
      `Attempted to access ${entityType} #${entityId} from project #${projectContext.project_id}, but it belongs to project #${actualProjectId}`,
      projectContext.project_id,
      entityId,
      projectContext.user_id
    );

    throw new ProjectContextError(
      `Access denied: ${entityType} #${entityId} belongs to a different project. You can only access items from your current project (${projectContext.project_name}).`,
      'PROJECT_ACCESS_DENIED'
    );
  }
}

export function detectConflict(
  db: AgileDatabase,
  entityType: 'epic' | 'story' | 'task' | 'bug',
  entityId: number,
  currentUserId: string
): boolean {
  // NOTE: Conflict detection based on last_modified_by has been removed
  // since we moved to an assigned_to model. If concurrent modification
  // detection is needed in the future, consider implementing optimistic
  // locking with version numbers or updated_at timestamps.
  return false;
}
