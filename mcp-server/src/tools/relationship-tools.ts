import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import type { AgileDatabase } from '@agile-mcp/shared';
import { getProjectContext, validateProjectAccess, ProjectContextError } from '../utils/project-context.js';
import type { EntityType, RelationshipType } from '@agile-mcp/shared';

export async function handleRelationshipTools(request: CallToolRequest, db: AgileDatabase) {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'create_relationship') {
      const ctx = getProjectContext(
        db,
        args.project_identifier as string,
        args.user_id as string
      );

      // Validate both source and target belong to this project (skip for project entities)
      const sourceType = args.source_type as EntityType;
      const targetType = args.target_type as EntityType;

      if (sourceType !== 'project') {
        validateProjectAccess(db, ctx, sourceType as 'epic' | 'story' | 'task', args.source_id as number);
      }
      if (targetType !== 'project') {
        validateProjectAccess(db, ctx, targetType as 'epic' | 'story' | 'task', args.target_id as number);
      }

      try {
        const relationship = db.createRelationship({
          source_type: args.source_type as EntityType,
          source_id: args.source_id as number,
          target_type: args.target_type as EntityType,
          target_id: args.target_id as number,
          relationship_type: args.relationship_type as RelationshipType,
          project_id: ctx.project_id,
          created_by: ctx.user_id,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                relationship,
                project: ctx.project_name,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: (error as Error).message,
              }, null, 2),
            },
          ],
        };
      }
    }

    if (name === 'delete_relationship') {
      const ctx = getProjectContext(
        db,
        args.project_identifier as string,
        args.user_id as string
      );

      // Get the relationship first to validate project access
      const relationship = db.getRelationship(args.id as number);
      if (relationship) {
        if (relationship.project_id !== ctx.project_id) {
          throw new ProjectContextError(
            `Relationship ${args.id} does not belong to project ${ctx.project_identifier}`,
            'PROJECT_VIOLATION'
          );
        }
      }

      db.deleteRelationship(args.id as number);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Relationship ${args.id} removed successfully`,
            }, null, 2),
          },
        ],
      };
    }

    if (name === 'list_relationships') {
      const ctx = getProjectContext(
        db,
        args.project_identifier as string,
        args.user_id as string
      );

      const filters: any = {
        project_id: ctx.project_id,
      };

      if (args.source_type !== undefined) {
        filters.source_type = args.source_type;
      }
      if (args.source_id !== undefined) {
        filters.source_id = args.source_id;
        // Validate source belongs to this project (skip for project entities)
        if (args.source_type && args.source_type !== 'project') {
          validateProjectAccess(db, ctx, args.source_type as 'epic' | 'story' | 'task', args.source_id as number);
        }
      }
      if (args.target_type !== undefined) {
        filters.target_type = args.target_type;
      }
      if (args.target_id !== undefined) {
        filters.target_id = args.target_id;
        // Validate target belongs to this project (skip for project entities)
        if (args.target_type && args.target_type !== 'project') {
          validateProjectAccess(db, ctx, args.target_type as 'epic' | 'story' | 'task', args.target_id as number);
        }
      }
      if (args.relationship_type !== undefined) {
        filters.relationship_type = args.relationship_type;
      }

      const relationships = db.listRelationships(filters);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              project: ctx.project_name,
              count: relationships.length,
              relationships,
            }, null, 2),
          },
        ],
      };
    }

    if (name === 'get_relationships_for_entity') {
      const ctx = getProjectContext(
        db,
        args.project_identifier as string,
        args.user_id as string
      );

      // Validate entity belongs to this project (skip for project entities)
      const entityType = args.entity_type as EntityType;
      if (entityType !== 'project') {
        validateProjectAccess(db, ctx, entityType as 'epic' | 'story' | 'task', args.entity_id as number);
      }

      const relationships = db.getRelationshipsForEntity(
        args.entity_type as EntityType,
        args.entity_id as number
      );

      // Filter to only this project's relationships
      const projectRelationships = relationships.filter(r => r.project_id === ctx.project_id);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              project: ctx.project_name,
              entity_type: args.entity_type,
              entity_id: args.entity_id,
              count: projectRelationships.length,
              relationships: projectRelationships,
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
