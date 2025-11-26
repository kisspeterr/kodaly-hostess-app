import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserPlus, X, Search } from 'lucide-react';
import { createPortal } from 'react-dom';

const UserSelector = ({ onSelect, onClose, excludeUserIds = [] }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .order('full_name');

            if (error) throw error;
            setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(user =>
        !excludeUserIds.includes(user.id) &&
        (user.full_name?.toLowerCase().includes(inputValue.toLowerCase()) ||
            user.email?.toLowerCase().includes(inputValue.toLowerCase()))
    );

    const handleSelect = (user) => {
        onSelect(user);
        onClose();
    };

    return createPortal(
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '1rem'
        }}>
            <div style={{
                background: 'var(--color-bg)',
                padding: '1.5rem',
                borderRadius: 'var(--radius-lg)',
                width: '100%',
                maxWidth: '500px',
                position: 'relative',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-text-muted)',
                        cursor: 'pointer'
                    }}
                >
                    <X size={24} />
                </button>

                <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Felhasználó Kiválasztása</h3>

                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                    <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Keresés név vagy email alapján..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        autoFocus
                        style={{
                            width: '100%',
                            padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'white',
                            outline: 'none'
                        }}
                    />
                </div>

                <div style={{ overflowY: 'auto', flex: 1, minHeight: '200px' }}>
                    {loading ? (
                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Betöltés...</div>
                    ) : filteredUsers.length === 0 ? (
                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Nincs találat.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {filteredUsers.map(user => (
                                <div
                                    key={user.id}
                                    onClick={() => handleSelect(user)}
                                    style={{
                                        padding: '0.75rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        background: 'var(--color-surface)',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid transparent',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--color-primary)';
                                        e.currentTarget.style.background = 'var(--color-surface-hover)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = 'transparent';
                                        e.currentTarget.style.background = 'var(--color-surface)';
                                    }}
                                >
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        background: 'var(--color-primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        fontSize: '0.8rem'
                                    }}>
                                        {user.full_name.charAt(0)}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{user.full_name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{user.email}</div>
                                    </div>
                                    <UserPlus size={16} style={{ marginLeft: 'auto', color: 'var(--color-primary)' }} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default UserSelector;
