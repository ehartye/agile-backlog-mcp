import { useState, useEffect } from 'react';
import { StickyNote, Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import { api } from '../utils/api';
import type { Note, EntityType } from '../types';

interface NotesPanelProps {
  entityType: EntityType;
  entityId: number;
  entityTitle: string;
  projectId: number;
  agentIdentifier?: string;
}

export default function NotesPanel({ entityType, entityId, projectId, agentIdentifier = 'web-ui' }: NotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    content: '',
    author_name: '',
  });

  useEffect(() => {
    loadNotes();
  }, [entityType, entityId]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await api.notes.forEntity(entityType, entityId);
      setNotes(data);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.content.trim()) {
      alert('Please enter note content');
      return;
    }

    try {
      await api.notes.create({
        parent_type: entityType,
        parent_id: entityId,
        content: formData.content,
        author_name: formData.author_name || null,
        project_id: projectId,
        agent_identifier: agentIdentifier,
      });

      setShowForm(false);
      setFormData({ content: '', author_name: '' });
      loadNotes();
    } catch (error) {
      alert(`Failed to create note: ${(error as Error).message}`);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingNote || !formData.content.trim()) {
      return;
    }

    try {
      await api.notes.update(editingNote.id, {
        content: formData.content,
        author_name: formData.author_name || null,
        agent_identifier: agentIdentifier,
      });

      setEditingNote(null);
      setFormData({ content: '', author_name: '' });
      loadNotes();
    } catch (error) {
      alert(`Failed to update note: ${(error as Error).message}`);
    }
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setFormData({
      content: note.content,
      author_name: note.author_name || '',
    });
    setShowForm(false);
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setFormData({ content: '', author_name: '' });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      await api.notes.delete(id);
      loadNotes();
    } catch (error) {
      alert(`Failed to delete note: ${(error as Error).message}`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return <div className="text-gray-600">Loading notes...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <StickyNote className="w-5 h-5 text-yellow-600" />
          Notes
        </h3>
        {!editingNote && (
          <button
            onClick={() => {
              setShowForm(!showForm);
              setFormData({ content: '', author_name: '' });
            }}
            className="flex items-center gap-2 px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Note
          </button>
        )}
      </div>

      {(showForm || editingNote) && (
        <form onSubmit={editingNote ? handleUpdate : handleCreate} className="mb-4 p-4 bg-gray-50 rounded border">
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Content (Markdown supported)</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full border rounded px-3 py-2 text-sm font-mono"
              rows={6}
              placeholder="Enter note content (markdown supported)..."
              required
            />
          </div>

          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Author Name (optional)</label>
            <input
              type="text"
              value={formData.author_name}
              onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Your name (optional)"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
            >
              <Save className="w-4 h-4" />
              {editingNote ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={editingNote ? handleCancelEdit : () => setShowForm(false)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </form>
      )}

      {notes.length === 0 ? (
        <p className="text-gray-500 text-sm">No notes yet</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`p-4 rounded border ${
                editingNote?.id === note.id ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-700">
                      {note.author_name || note.agent_identifier}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(note.created_at)}
                    </span>
                    {note.created_at !== note.updated_at && (
                      <span className="text-xs text-gray-400">(edited)</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(note)}
                    className="text-blue-600 hover:text-blue-800 p-1"
                    title="Edit note"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="Delete note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-sm text-gray-800 whitespace-pre-wrap font-mono bg-white p-3 rounded border">
                {note.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
