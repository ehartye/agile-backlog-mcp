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
  agentIdentifier: string,
  modifiedBy?: string
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
      agentIdentifier
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
    agent_identifier: agentIdentifier,
    modified_by: modifiedBy || agentIdentifier,
  };
}

export function validateProjectAccess(
  db: AgileDatabase,
  projectContext: ProjectContext,
  entityType: 'epic' | 'story' | 'task',
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
      projectContext.agent_identifier
    );

    throw new ProjectContextError(
      `Access denied: ${entityType} #${entityId} belongs to a different project. You can only access items from your current project (${projectContext.project_name}).`,
      'PROJECT_ACCESS_DENIED'
    );
  }
}

export function detectConflict(
  db: AgileDatabase,
  entityType: 'epic' | 'story' | 'task',
  entityId: number,
  currentModifiedBy: string,
  currentAgentIdentifier: string
): boolean {
  let entity: any = null;

  switch (entityType) {
    case 'epic':
      entity = db.getEpic(entityId);
      break;
    case 'story':
      entity = db.getStory(entityId);
      break;
    case 'task':
      entity = db.getTask(entityId);
      break;
  }

  if (!entity) {
    return false;
  }

  // Check if last modifier is different from current
  if (entity.last_modified_by && entity.last_modified_by !== currentModifiedBy) {
    const projectId = (() => {
      switch (entityType) {
        case 'epic': return db.getProjectIdForEpic(entityId);
        case 'story': return db.getProjectIdForStory(entityId);
        case 'task': return db.getProjectIdForTask(entityId);
        default: return null;
      }
    })();

    db.logSecurityEvent(
      'conflict_detected',
      '',
      entityType,
      `Concurrent modification detected: ${entityType} #${entityId} was last modified by '${entity.last_modified_by}', now being modified by '${currentModifiedBy}'`,
      projectId,
      entityId,
      currentAgentIdentifier
    );

    return true;
  }

  return false;
}
