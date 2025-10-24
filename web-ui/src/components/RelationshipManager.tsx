import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Link2, Plus, Trash2 } from 'lucide-react';
import { api } from '../utils/api';
import type { Relationship, EntityType, RelationshipType } from '../types';

interface RelationshipManagerProps {
  entityType: EntityType;
  entityId: number;
  entityTitle?: string;
  projectId: number;
}

const RELATIONSHIP_TYPES: { value: RelationshipType; label: string }[] = [
  { value: 'blocks', label: 'Blocks' },
  { value: 'blocked_by', label: 'Blocked By' },
  { value: 'related_to', label: 'Related To' },
  { value: 'cloned_from', label: 'Cloned From' },
  { value: 'depends_on', label: 'Depends On' },
];

const ENTITY_TYPES: { value: EntityType; label: string }[] = [
  { value: 'epic', label: 'Epic' },
  { value: 'story', label: 'Story' },
  { value: 'task', label: 'Task' },
];

interface SearchResult {
  id: number;
  title: string;
  type: EntityType;
}

export default function RelationshipManager({ entityType, entityId, projectId }: RelationshipManagerProps) {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    target_type: 'story' as EntityType,
    target_id: 0,
    relationship_type: 'related_to' as RelationshipType,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<SearchResult | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [entityTitles, setEntityTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    loadRelationships();
  }, [entityType, entityId]);

  useEffect(() => {
    if (searchQuery.length > 0) {
      searchEntities();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, formData.target_type, projectId]);

  const loadRelationships = async () => {
    try {
      setLoading(true);
      const data = await api.relationships.forEntity(entityType, entityId);
      setRelationships(data);

      // Load titles for all related entities
      await loadEntityTitles(data);
    } catch (error) {
      console.error('Failed to load relationships:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEntityTitles = async (relationships: Relationship[]) => {
    const titles: Record<string, string> = {};

    // Collect unique entities to fetch
    const entitiesToFetch: Array<{ type: EntityType; id: number }> = [];

    for (const rel of relationships) {
      const isSource = rel.source_type === entityType && rel.source_id === entityId;
      const targetType = isSource ? rel.target_type : rel.source_type;
      const targetId = isSource ? rel.target_id : rel.source_id;

      const key = `${targetType}-${targetId}`;
      if (!titles[key]) {
        entitiesToFetch.push({ type: targetType, id: targetId });
      }
    }

    // Fetch titles for each entity
    for (const entity of entitiesToFetch) {
      try {
        let title = `${entity.type} #${entity.id}`;

        if (entity.type === 'epic') {
          const epicData = await api.epics.get(entity.id);
          title = epicData.epic.title;
        } else if (entity.type === 'story') {
          const storyData = await api.stories.get(entity.id);
          title = storyData.story.title;
        } else if (entity.type === 'task') {
          // Tasks don't have a get endpoint, so we'll keep the ID format
          // Or we could fetch the parent story and filter tasks
          title = `Task #${entity.id}`;
        }

        titles[`${entity.type}-${entity.id}`] = title;
      } catch (error) {
        console.error(`Failed to load title for ${entity.type} ${entity.id}:`, error);
        titles[`${entity.type}-${entity.id}`] = `${entity.type} #${entity.id}`;
      }
    }

    setEntityTitles(titles);
  };

  const searchEntities = async () => {
    try {
      let results: SearchResult[] = [];

      if (formData.target_type === 'epic') {
        const epics = await api.epics.list({ project_id: projectId });
        results = epics
          .filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()))
          .map(e => ({ id: e.id, title: e.title, type: 'epic' as EntityType }));
      } else if (formData.target_type === 'story') {
        const stories = await api.stories.list({ project_id: projectId });
        results = stories
          .filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
          .map(s => ({ id: s.id, title: s.title, type: 'story' as EntityType }));
      } else if (formData.target_type === 'task') {
        const tasks = await api.tasks.list({ project_id: projectId });
        results = tasks
          .filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
          .map(t => ({ id: t.id, title: t.title, type: 'task' as EntityType }));
      }

      setSearchResults(results.slice(0, 10)); // Limit to 10 results
    } catch (error) {
      console.error('Failed to search entities:', error);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEntity) {
      alert('Please select an entity');
      return;
    }

    try {
      await api.relationships.create({
        source_type: entityType,
        source_id: entityId,
        target_type: formData.target_type,
        target_id: selectedEntity.id,
        relationship_type: formData.relationship_type,
        project_id: projectId,
        agent_identifier: 'web-ui',
      });

      setShowForm(false);
      setFormData({
        target_type: 'story',
        target_id: 0,
        relationship_type: 'related_to',
      });
      setSelectedEntity(null);
      setSearchQuery('');
      setSearchResults([]);
      loadRelationships();
    } catch (error) {
      alert(`Failed to create relationship: ${(error as Error).message}`);
    }
  };

  const handleSelectEntity = (entity: SearchResult) => {
    setSelectedEntity(entity);
    setSearchQuery(entity.title);
    setShowDropdown(false);
    setFormData({ ...formData, target_id: entity.id });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this relationship?')) {
      return;
    }

    try {
      await api.relationships.delete(id);
      loadRelationships();
    } catch (error) {
      alert(`Failed to delete relationship: ${(error as Error).message}`);
    }
  };

  const getRelationshipLabel = (rel: Relationship) => {
    const isSource = rel.source_type === entityType && rel.source_id === entityId;

    if (isSource) {
      return {
        direction: `${rel.relationship_type.replace(/_/g, ' ')}`,
        targetType: rel.target_type,
        targetId: rel.target_id,
      };
    } else {
      // This entity is the target
      const inverseType = rel.relationship_type === 'blocks' ? 'blocked by' :
                         rel.relationship_type === 'blocked_by' ? 'blocks' :
                         rel.relationship_type;
      return {
        direction: inverseType.replace(/_/g, ' '),
        targetType: rel.source_type,
        targetId: rel.source_id,
      };
    }
  };

  if (loading) {
    return <div className="text-gray-600">Loading relationships...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Link2 className="w-5 h-5 text-blue-600" />
          Relationships
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Relationship
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-4 p-4 bg-gray-50 rounded border">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium mb-1">Relationship Type</label>
              <select
                value={formData.relationship_type}
                onChange={(e) => setFormData({ ...formData, relationship_type: e.target.value as RelationshipType })}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                {RELATIONSHIP_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Target Type</label>
              <select
                value={formData.target_type}
                onChange={(e) => setFormData({ ...formData, target_type: e.target.value as EntityType })}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                {ENTITY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium mb-1">Search Entity</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                  setSelectedEntity(null);
                }}
                onFocus={() => setShowDropdown(true)}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Type to search..."
                required
              />
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      type="button"
                      onClick={() => handleSelectEntity(result)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm border-b last:border-b-0"
                    >
                      <div className="font-medium">{result.title}</div>
                      <div className="text-xs text-gray-500">ID: {result.id}</div>
                    </button>
                  ))}
                </div>
              )}
              {selectedEntity && (
                <div className="mt-1 text-xs text-green-600">
                  Selected: {selectedEntity.title} (ID: {selectedEntity.id})
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {relationships.length === 0 ? (
        <p className="text-gray-500 text-sm">No relationships defined</p>
      ) : (
        <div className="space-y-2">
          {relationships.map((rel) => {
            const label = getRelationshipLabel(rel);
            const titleKey = `${label.targetType}-${label.targetId}`;
            const title = entityTitles[titleKey] || `${label.targetType} #${label.targetId}`;

            return (
              <div
                key={rel.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded border"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {label.direction}
                  </span>
                  {label.targetType === 'story' ? (
                    <Link
                      to={projectId ? `/project/${projectId}/story/${label.targetId}` : '#'}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {title}
                    </Link>
                  ) : (
                    <span className="text-sm text-gray-500">
                      {title}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(rel.id)}
                  className="text-red-600 hover:text-red-800 p-1"
                  title="Delete relationship"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
