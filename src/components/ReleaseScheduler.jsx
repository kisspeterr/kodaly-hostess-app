import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Save } from 'lucide-react';

const ReleaseScheduler = ({ year, month, onClose }) => {
    const [groups, setGroups] = useState([]);
    const [releases, setReleases] = useState({}); // groupId -> release_at (ISO string)
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [year, month]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Groups
            const { data: groupsData, error: groupsError } = await supabase
                .from('groups')
                .select('*')
                .order('name');
            if (groupsError) throw groupsError;
            setGroups(groupsData);

            // Fetch existing releases for this month
            const { data: releasesData, error: releasesError } = await supabase
                .from('monthly_releases')
                .select('*')
                .eq('year', year)
                .eq('month', month + 1); // DB uses 1-12
            if (releasesError) throw releasesError;

            const relMap = {};
            releasesData.forEach(r => {
                relMap[r.group_id] = r.release_at;
            });
            setReleases(relMap);
        } catch (error) {
            console.error('Error fetching release data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (groupId, dateValue) => {
        try {
            // If dateValue is empty, maybe delete the release? Or just ignore?
            // Let's assume setting a date is required to "release".
            // If cleared, we delete the record.

            if (!dateValue) {
                const { error } = await supabase
                    .from('monthly_releases')
                    .delete()
                    .eq('year', year)
                    .eq('month', month + 1)
                    .eq('group_id', groupId);
                if (error) throw error;
                const newRels = { ...releases };
                delete newRels[groupId];
                setReleases(newRels);
                return;
            }

            const releaseAt = new Date(dateValue).toISOString();

            const { error } = await supabase
                .from('monthly_releases')
                .upsert({
                    year: year,
                    month: month + 1,
                    group_id: groupId,
                    release_at: releaseAt
                }, { onConflict: 'year, month, group_id' });

            if (error) throw error;

            setReleases({ ...releases, [groupId]: releaseAt });
            alert('Időzítés mentve!');
        } catch (error) {
            console.error('Error saving release:', error);
            alert('Nem sikerült menteni az időzítést');
        }
    };

    // Helper for datetime-local input
    const toLocalISO = (isoString) => {
        if (!isoString) return '';
        return new Date(isoString).toISOString().slice(0, 16);
    };

    return (
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
            zIndex: 1000,
            padding: '1rem'
        }}>
            <div style={{
                background: 'var(--color-bg)',
                padding: '2rem',
                borderRadius: 'var(--radius-lg)',
                width: '100%',
                maxWidth: '600px',
                position: 'relative',
                maxHeight: '90vh',
                overflowY: 'auto'
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

                <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>
                    Közzététel Időzítése
                </h2>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                    {year}. {new Date(year, month).toLocaleDateString('hu-HU', { month: 'long' })}
                </p>

                {loading ? (
                    <p>Betöltés...</p>
                ) : groups.length === 0 ? (
                    <p>Nincsenek létrehozott csoportok. A "Felhasználók" menüben hozhatsz létre csoportokat.</p>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {groups.map(group => (
                            <div key={group.id} className="glass-panel" style={{ padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{group.name}</div>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <input
                                        type="datetime-local"
                                        value={toLocalISO(releases[group.group_id] || releases[group.id])} // Handle both cases if needed, but fetch uses group_id map
                                        onChange={(e) => handleSave(group.id, e.target.value)}
                                        style={{
                                            flex: 1,
                                            padding: '0.5rem',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid var(--color-border)',
                                            background: 'var(--color-surface)',
                                            color: 'white'
                                        }}
                                    />
                                    {/* Save is automatic on change/blur usually, but let's make it explicit or on change? 
                                        I put it on change for simplicity, but alert might be annoying.
                                        Let's remove the alert from handleSave and just show a saved indicator or use a button.
                                    */}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                                    {releases[group.id] ?
                                        (new Date(releases[group.id]) < new Date() ? 'Már látható' : 'Még nem látható')
                                        : 'Nincs beállítva (Nem látható)'}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReleaseScheduler;
