import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import type { AgileDatabase } from '@agile-mcp/shared';
import { getProjectContext, validateProjectAccess, ProjectContextError } from '../utils/project-context.js';
import type { EntityType } from '@agile-mcp/shared';

export async function handleNoteTools(request: CallToolRequest, db: AgileDatabase) {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'create_note') {
      const ctx = getProjectContext(
        db,
        args.project_identifier as string,
        args.agent_identifier as string
      );

      // Validate parent entity belongs to this project (skip for project entities)
      const parentType = args.parent_type as EntityType;
      if (parentType !== 'project') {
        validateProjectAccess(db, ctx, parentType as 'epic' | 'story' | 'task', args.parent_id as number);
      }

      const note = db.createNote({
        parent_type: args.parent_type as EntityType,
        parent_id: args.parent_id as number,
        content: args.content as string,
        agent_identifier: ctx.agent_identifier,
        author_name: args.author_name as string | null | undefined,
        project_id: ctx.project_id,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              note,
              project: ctx.project_name,
            }, null, 2),
          },
        ],
      };
    }

    if (name === 'update_note') {
      const ctx = getProjectContext(
        db,
        args.project_identifier as string,
        args.agent_identifier as string
      );

      // Get the note first to validate project access
      const existingNote = db.getNote(args.id as number);
      if (existingNote) {
        if (existingNote.project_id !== ctx.project_id) {
          throw new ProjectContextError(
            `Note ${args.id} does not belong to project ${ctx.project_identifier}`,
            'PROJECT_VIOLATION'
          );
        }
      }

      const note = db.updateNote({
        id: args.id as number,
        content: args.content as string,
        agent_identifier: ctx.agent_identifier,
        author_name: args.author_name as string | null | undefined,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              note,
              project: ctx.project_name,
            }, null, 2),
          },
        ],
      };
    }

    if (name === 'delete_note') {
      const ctx = getProjectContext(
        db,
        args.project_identifier as string,
        args.agent_identifier as string
      );

      // Get the note first to validate project access
      const note = db.getNote(args.id as number);
      if (note) {
        if (note.project_id !== ctx.project_id) {
          throw new ProjectContextError(
            `Note ${args.id} does not belong to project ${ctx.project_identifier}`,
            'PROJECT_VIOLATION'
          );
        }
      }

      db.deleteNote(args.id as number);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Note ${args.id} deleted successfully`,
            }, null, 2),
          },
        ],
      };
    }

    if (name === 'list_notes') {
      const ctx = getProjectContext(
        db,
        args.project_identifier as string,
        args.agent_identifier as string
      );

      const filters: any = {
        project_id: ctx.project_id,
      };

      if (args.parent_type !== undefined) {
        filters.parent_type = args.parent_type;
      }
      if (args.parent_id !== undefined) {
        filters.parent_id = args.parent_id;
        // Validate parent belongs to this project (skip for project entities)
        if (args.parent_type && args.parent_type !== 'project') {
          validateProjectAccess(db, ctx, args.parent_type as 'epic' | 'story' | 'task', args.parent_id as number);
        }
      }
      if (args.agent_identifier !== undefined) {
        filters.agent_identifier = args.agent_identifier;
      }

      const notes = db.listNotes(filters);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              project: ctx.project_name,
              count: notes.length,
              notes,
            }, null, 2),
          },
        ],
      };
    }

    if (name === 'get_notes_for_entity') {
      const ctx = getProjectContext(
        db,
        args.project_identifier as string,
        args.agent_identifier as string
      );

      // Validate entity belongs to this project (skip for project entities)
      const entityType = args.entity_type as EntityType;
      if (entityType !== 'project') {
        validateProjectAccess(db, ctx, entityType as 'epic' | 'story' | 'task', args.entity_id as number);
      }

      const notes = db.getNotesForEntity(
        args.entity_type as EntityType,
        args.entity_id as number
      );

      // Filter to only this project's notes
      const projectNotes = notes.filter(n => n.project_id === ctx.project_id);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              project: ctx.project_name,
              entity_type: args.entity_type,
              entity_id: args.entity_id,
              count: projectNotes.length,
              notes: projectNotes,
            }, null, 2),
          },
        ],
      };
    }

    return { content: [] };
  } catch (error) {
    if (error instanceof ProjectContextError) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              code: error.code,
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
    throw error;
  }

  return null; // Tool not found
}
