import { useState, useEffect } from 'react';
import { Link2, Plus, Trash2 } from 'lucide-react';
import { api } from '../utils/api';
import type { Relationship, EntityType, RelationshipType } from '../types';

interface RelationshipManagerProps {
  entityType: EntityType;
  entityId: number;
  entityTitle: string;
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

export default function RelationshipManager({ entityType, entityId, projectId }: RelationshipManagerProps) {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    target_type: 'story' as EntityType,
    target_id: 0,
    relationship_type: 'related_to' as RelationshipType,
  });

  useEffect(() => {
    loadRelationships();
  }, [entityType, entityId]);

  const loadRelationships = async () => {
    try {
      setLoading(true);
      const data = await api.relationships.forEntity(entityType, entityId);
      setRelationships(data);
    } catch (error) {
      console.error('Failed to load relationships:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.target_id) {
      alert('Please enter a valid target ID');
      return;
    }

    try {
      await api.relationships.create({
        source_type: entityType,
        source_id: entityId,
        target_type: formData.target_type,
        target_id: formData.target_id,
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
      loadRelationships();
    } catch (error) {
      alert(`Failed to create relationship: ${(error as Error).message}`);
    }
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

            <div>
              <label className="block text-sm font-medium mb-1">Target ID</label>
              <input
                type="number"
                value={formData.target_id || ''}
                onChange={(e) => setFormData({ ...formData, target_id: parseInt(e.target.value) })}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Enter ID"
                required
              />
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
            return (
              <div
                key={rel.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded border"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {label.direction}
                  </span>
                  <span className="text-sm text-gray-500">
                    {label.targetType} #{label.targetId}
                  </span>
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
