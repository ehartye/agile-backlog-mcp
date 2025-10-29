import { useEffect, useState } from 'react';
import type { User } from '../types';

interface UserSelectorProps {
  value: string | null;
  onChange: (userId: string | null) => void;
  label?: string;
  placeholder?: string;
  allowNull?: boolean;
}

export function UserSelector({
  value,
  onChange,
  label = 'Assigned To',
  placeholder = 'Select user',
  allowNull = true
}: UserSelectorProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-group">
      <label>{label}</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={loading}
      >
        {allowNull && <option value="">{placeholder}</option>}
        {loading && <option value="">Loading...</option>}
        {error && <option value="">Error loading users</option>}
        {!loading && !error && users.map(user => (
          <option key={user.user_id} value={user.user_id}>
            {user.display_name} ({user.user_type})
          </option>
        ))}
      </select>
    </div>
  );
}
