import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const UserManagement = () => {
    const [groups, setGroups] = useState([]);
    const [memberships, setMemberships] = useState({}); // userId -> Set(groupIds)
    const [newGroupName, setNewGroupName] = useState('');
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Users
            const { data: usersData, error: usersError } = await supabase
                .from('profiles')
                .select('*')
                .order('full_name', { ascending: true });
            if (usersError) throw usersError;
            setUsers(usersData);

            // Fetch Groups
            const { data: groupsData, error: groupsError } = await supabase
                .from('groups')
                .select('*')
                .order('name', { ascending: true });
            if (groupsError) throw groupsError;
            setGroups(groupsData);

            // Fetch Memberships
            const { data: membershipsData, error: membershipsError } = await supabase
                .from('user_group_memberships')
                .select('*');
            if (membershipsError) throw membershipsError;

            // Process memberships into a map
            const memMap = {};
            membershipsData.forEach(m => {
                if (!memMap[m.user_id]) memMap[m.user_id] = new Set();
                memMap[m.user_id].add(m.group_id);
            });
            setMemberships(memMap);

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;
        try {
            const { data, error } = await supabase
                .from('groups')
                .insert({ name: newGroupName.trim() })
                .select()
                .single();

            if (error) throw error;
            setGroups([...groups, data]);
            setNewGroupName('');
        } catch (error) {
            console.error('Error creating group:', error);
            alert('Nem sikerült létrehozni a csoportot');
        }
    };

    const handleDeleteGroup = async (groupId) => {
        if (!confirm('Biztosan törlöd ezt a csoportot?')) return;
        try {
            const { error } = await supabase
                .from('groups')
                .delete()
                .eq('id', groupId);

            if (error) throw error;
            setGroups(groups.filter(g => g.id !== groupId));
            // Update memberships locally
            const newMems = { ...memberships };
            Object.keys(newMems).forEach(uid => {
                if (newMems[uid].has(groupId)) {
                    newMems[uid].delete(groupId);
                }
            });
            setMemberships(newMems);
        } catch (error) {
            console.error('Error deleting group:', error);
            alert('Nem sikerült törölni a csoportot');
        }
    };

    const toggleMembership = async (userId, groupId) => {
        const currentMems = memberships[userId] || new Set();
        const isMember = currentMems.has(groupId);

        try {
            if (isMember) {
                // Remove (Deselect)
                const { error } = await supabase
                    .from('user_group_memberships')
                    .delete()
                    .eq('user_id', userId)
                    .eq('group_id', groupId);
                if (error) throw error;

                const newSet = new Set(currentMems);
                newSet.delete(groupId);
                setMemberships({ ...memberships, [userId]: newSet });
            } else {
                // Add (Switch to this group)
                // First remove from all other groups to enforce single membership
                const { error: deleteError } = await supabase
                    .from('user_group_memberships')
                    .delete()
                    .eq('user_id', userId);

                if (deleteError) throw deleteError;

                // Then add to new group
                const { error: insertError } = await supabase
                    .from('user_group_memberships')
                    .insert({ user_id: userId, group_id: groupId });

                if (insertError) throw insertError;

                // Update local state: User is now ONLY in this group
                const newSet = new Set();
                newSet.add(groupId);
                setMemberships({ ...memberships, [userId]: newSet });
            }
        } catch (error) {
            console.error('Error updating membership:', error);
            alert('Nem sikerült frissíteni a tagságot');
        }
    };

    const updateStrikes = async (userId, currentStrikes, change) => {
        const newStrikes = Math.max(0, currentStrikes + change);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ strikes: newStrikes })
                .eq('id', userId);

            if (error) throw error;

            setUsers(prev => prev.map(u =>
                u.id === userId ? { ...u, strikes: newStrikes } : u
            ));
        } catch (error) {
            console.error('Error updating strikes:', error);
            alert('Failed to update strikes');
        }
    };

    const handleInvite = () => {
        const email = prompt("Add meg a meghívandó email címet:");
        if (email) {
            alert(`Meghívó elküldve ide: ${email} (Szimuláció). Éles környezetben ez emailt küldene.`);
            window.location.href = `mailto:${email}?subject=Meghívó a Kodály Hostess Applikációba&body=Kérlek regisztrálj itt: ${window.location.origin}/register`;
        }
    };

    if (loading) return <div style={{ padding: '2rem' }}>Adatok betöltése...</div>;

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ margin: 0 }}>Felhasználó Kezelés</h1>
                <button
                    onClick={handleInvite}
                    style={{ padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--color-primary)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                >
                    Felhasználó Meghívása
                </button>
            </div>

            {/* Group Management Section */}
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '2rem' }}>
                <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Csoportok</h2>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    {groups.map(group => (
                        <div key={group.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: 'var(--color-surface)',
                            padding: '0.5rem 1rem',
                            borderRadius: '999px',
                            border: '1px solid var(--color-border)'
                        }}>
                            <span style={{ fontWeight: 'bold' }}>{group.name}</span>
                            <button
                                onClick={() => handleDeleteGroup(group.id)}
                                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 0, display: 'flex' }}
                                title="Csoport törlése"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                    {groups.length === 0 && <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Nincsenek csoportok.</span>}
                </div>

                <form onSubmit={handleCreateGroup} style={{ display: 'flex', gap: '1rem' }}>
                    <input
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="Új csoport neve (pl. 1. Kör)"
                        style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'white', minWidth: '250px' }}
                    />
                    <button
                        type="submit"
                        disabled={!newGroupName.trim()}
                        style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--color-primary)', color: 'white', fontWeight: 'bold', cursor: newGroupName.trim() ? 'pointer' : 'not-allowed', opacity: newGroupName.trim() ? 1 : 0.5 }}
                    >
                        Létrehozás
                    </button>
                </form>
            </div>

            <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--color-text)' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', background: 'rgba(0,0,0,0.2)' }}>
                                <th style={{ padding: '1rem' }}>Név</th>
                                <th style={{ padding: '1rem' }}>Email</th>
                                <th style={{ padding: '1rem' }}>Szerepkör</th>
                                <th style={{ padding: '1rem' }}>Csoportok</th>
                                <th style={{ padding: '1rem' }}>Strigulák</th>
                                <th style={{ padding: '1rem' }}>Műveletek</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: '1rem' }}>{u.full_name}</td>
                                    <td style={{ padding: '1rem' }}>{u.email}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '999px',
                                            background: u.role === 'admin' ? 'var(--color-primary)' : 'var(--color-surface-hover)',
                                            fontSize: '0.875rem'
                                        }}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {groups.map(g => {
                                                const isMember = memberships[u.id]?.has(g.id);
                                                return (
                                                    <button
                                                        key={g.id}
                                                        onClick={() => toggleMembership(u.id, g.id)}
                                                        style={{
                                                            padding: '0.25rem 0.5rem',
                                                            borderRadius: '4px',
                                                            border: `1px solid ${isMember ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                                            background: isMember ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                                            color: isMember ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                                            cursor: 'pointer',
                                                            fontSize: '0.75rem'
                                                        }}
                                                    >
                                                        {g.name}
                                                    </button>
                                                );
                                            })}
                                            {groups.length === 0 && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>-</span>}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{
                                            fontWeight: 'bold',
                                            color: u.strikes >= 10 ? '#ef4444' : 'var(--color-text)'
                                        }}>
                                            {u.strikes}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => updateStrikes(u.id, u.strikes, 1)}
                                                style={{ padding: '0.25rem 0.5rem', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', color: 'white', cursor: 'pointer', borderRadius: '4px' }}
                                            >
                                                +
                                            </button>
                                            <button
                                                onClick={() => updateStrikes(u.id, u.strikes, -1)}
                                                style={{ padding: '0.25rem 0.5rem', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', color: 'white', cursor: 'pointer', borderRadius: '4px' }}
                                            >
                                                -
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
