import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import LocationSelector from '../components/LocationSelector';
import UserSelector from '../components/UserSelector';
import { Trash2, Plus, Download, Eye, X } from 'lucide-react';
import { createPortal } from 'react-dom';

const JobTableEditor = () => {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('editor'); // 'editor' | 'table'
    const [activeJobIdForSelection, setActiveJobIdForSelection] = useState(null);

    const months = [
        'Január', 'Február', 'Március', 'Április', 'Május', 'Június',
        'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'
    ];

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i); // Last year + next 3

    useEffect(() => {
        fetchJobs();
    }, [selectedYear, selectedMonth]);

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const startOfMonth = new Date(selectedYear, selectedMonth, 1).toISOString();
            const endOfMonth = new Date(selectedYear, selectedMonth + 1, 1).toISOString();

            const { data: jobsData, error: jobsError } = await supabase
                .from('jobs')
                .select(`
                    *,
                    applications (
                        id,
                        status,
                        user_id,
                        profiles:user_id (id, full_name, email)
                    )
                `)
                .gte('date', startOfMonth)
                .lt('date', endOfMonth)
                .order('date', { ascending: true });

            if (jobsError) throw jobsError;

            // Filter applications to only show approved ones for the "Assigned" view
            const formattedJobs = jobsData.map(job => ({
                ...job,
                assigned_users: job.applications
                    .filter(app => app.status === 'approved')
                    .map(app => app.profiles)
                    .filter(profile => profile) // Filter out null profiles
            }));

            setJobs(formattedJobs);
        } catch (error) {
            console.error('Error fetching jobs:', error);
            alert('Nem sikerült betölteni a munkákat');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateJob = async (jobId, field, value) => {
        // Optimistic update
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, [field]: value } : j));

        try {
            // Format date/time fields if necessary
            let dbValue = value;
            if (field === 'date' || field === 'end_time') {
                dbValue = new Date(value).toISOString();
            }

            const { error } = await supabase
                .from('jobs')
                .update({ [field]: dbValue })
                .eq('id', jobId);

            if (error) throw error;
        } catch (error) {
            console.error(`Error updating job ${field}:`, error);
            alert(`Nem sikerült frissíteni: ${field}`);
            fetchJobs(); // Revert on error
        }
    };

    const handleAssignUser = async (jobId, user) => {
        // Optimistic update
        setJobs(prev => prev.map(j => {
            if (j.id === jobId) {
                // Check if user already assigned to avoid duplicates in UI
                if (j.assigned_users.some(u => u.id === user.id)) return j;
                return {
                    ...j,
                    slots_taken: (j.slots_taken || 0) + 1,
                    assigned_users: [...j.assigned_users, user]
                };
            }
            return j;
        }));

        try {
            // Check if application exists
            const { data: existingApp } = await supabase
                .from('applications')
                .select('id')
                .eq('job_id', jobId)
                .eq('user_id', user.id)
                .single();

            if (existingApp) {
                // Update to approved
                const { error } = await supabase
                    .from('applications')
                    .update({ status: 'approved' })
                    .eq('id', existingApp.id);
                if (error) throw error;
            } else {
                // Insert new approved application
                const { error } = await supabase
                    .from('applications')
                    .insert({
                        job_id: jobId,
                        user_id: user.id,
                        status: 'approved'
                    });
                if (error) throw error;
            }

            fetchJobs(); // Refresh to ensure sync
        } catch (error) {
            console.error('Error assigning user:', error);
            alert('Nem sikerült hozzárendelni a felhasználót');
            fetchJobs(); // Revert
        }
    };

    const handleRemoveUser = async (jobId, userId) => {
        if (!confirm('Biztosan eltávolítod ezt a felhasználót a munkából?')) return;

        // Optimistic update
        setJobs(prev => prev.map(j => {
            if (j.id === jobId) {
                return {
                    ...j,
                    slots_taken: Math.max((j.slots_taken || 0) - 1, 0),
                    assigned_users: j.assigned_users.filter(u => u.id !== userId)
                };
            }
            return j;
        }));

        try {
            const { error } = await supabase
                .from('applications')
                .delete()
                .eq('job_id', jobId)
                .eq('user_id', userId);

            if (error) throw error;
            fetchJobs();
        } catch (error) {
            console.error('Error removing user:', error);
            alert('Nem sikerült eltávolítani a felhasználót: ' + error.message);
            fetchJobs(); // Revert
        }
    };

    const generateMatrixData = () => {
        if (jobs.length === 0) return [];

        // 1. Prepare Data
        // Sort jobs by date
        const sortedJobs = [...jobs].sort((a, b) => new Date(a.date) - new Date(b.date));

        // Find max slots to determine number of rows
        const maxSlots = Math.max(...sortedJobs.map(j => j.slots_total), 0);

        // 2. Build Rows
        const rows = [];

        // Row 1: Dates (e.g., 06.05.csüt.)
        const dateRow = sortedJobs.map(job => {
            const date = new Date(job.date);
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const weekday = date.toLocaleDateString('hu-HU', { weekday: 'short' });
            return `${month}.${day}.${weekday}`;
        });
        rows.push(['', ...dateRow]); // First col empty for row labels

        // Row 2: Titles
        const titleRow = sortedJobs.map(job => job.title);
        rows.push(['', ...titleRow]);

        // Row 3: Times (e.g., 17.30-22.00)
        const timeRow = sortedJobs.map(job => {
            const start = new Date(job.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const end = job.end_time ? new Date(job.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '???';
            return `${start}-${end}`;
        });
        rows.push(['Felállás', ...timeRow]);

        // Row 4: Locations
        const locationRow = sortedJobs.map(job => `"${job.location || ''}"`);
        rows.push(['Helyszín', ...locationRow]);

        // Row 4: Empty separator
        const emptyRow = sortedJobs.map(() => '');
        rows.push(['', ...emptyRow]);

        // Rows 5+: Hostesses
        for (let i = 0; i < maxSlots; i++) {
            const row = [`${i + 1}.`]; // Row label: 1., 2., ...

            sortedJobs.forEach(job => {
                const assigned = job.assigned_users || [];
                const user = assigned[i];
                if (user) {
                    row.push(user.full_name);
                } else {
                    row.push('');
                }
            });
            rows.push(row);
        }
        return rows;
    };

    const handleExport = () => {
        if (jobs.length === 0) {
            alert('Nincs exportálható munka.');
            return;
        }

        const rows = generateMatrixData();

        // Escape quotes for CSV
        const csvRows = rows.map(row =>
            row.map(cell => `"${cell.replace(/"/g, '""')}"`)
        );

        // 3. Convert to CSV string
        const csvContent = csvRows.map(r => r.join(',')).join('\n');

        // 4. Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const exportDate = new Date().toLocaleDateString('hu-HU').replace(/\. /g, '-').replace(/\./g, '');
        link.setAttribute('download', `Kodály Központ Beosztás ${months[selectedMonth]} ${exportDate}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Helper to format date for input type="datetime-local"
    const toDateTimeLocal = (isoString) => {
        if (!isoString) return '';
        return new Date(isoString).toISOString().slice(0, 16);
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '100%', overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h1 style={{ margin: 0 }}>Beosztás Szerkesztő</h1>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'white', fontSize: '1rem' }}
                    >
                        {years.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>

                    <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                        {months.map((month, index) => (
                            <button
                                key={month}
                                onClick={() => setSelectedMonth(index)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '999px',
                                    border: 'none',
                                    background: selectedMonth === index ? 'var(--color-primary)' : 'var(--color-surface)',
                                    color: selectedMonth === index ? 'white' : 'var(--color-text-muted)',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {month}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', padding: '0.25rem' }}>
                        <button
                            onClick={() => setViewMode('editor')}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: 'var(--radius-sm)',
                                border: 'none',
                                background: viewMode === 'editor' ? 'var(--color-primary)' : 'transparent',
                                color: viewMode === 'editor' ? 'white' : 'var(--color-text-muted)',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            Szerkesztő
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: 'var(--radius-sm)',
                                border: 'none',
                                background: viewMode === 'table' ? 'var(--color-primary)' : 'transparent',
                                color: viewMode === 'table' ? 'white' : 'var(--color-text-muted)',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            Táblázat
                        </button>
                    </div>

                    <button
                        onClick={handleExport}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--color-primary)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        <Download size={18} /> Exportálás
                    </button>
                </div>
            </div>

            {loading ? (
                <p>Beosztás betöltése...</p>
            ) : (
                <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                    {viewMode === 'editor' ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.2)' }}>
                                    <th style={{ padding: '1rem', width: '200px' }}>Dátum & Idő</th>
                                    <th style={{ padding: '1rem', width: '200px' }}>Befejezés</th>
                                    <th style={{ padding: '1rem', width: '200px' }}>Cím</th>
                                    <th style={{ padding: '1rem', width: '200px' }}>Helyszín</th>
                                    <th style={{ padding: '1rem', width: '80px' }}>Helyek</th>
                                    <th style={{ padding: '1rem' }}>Beosztott Hostessek</th>
                                </tr>
                            </thead>
                            <tbody>
                                {jobs.map(job => (
                                    <tr key={job.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        <td style={{ padding: '0.5rem' }}>
                                            <input
                                                type="datetime-local"
                                                value={toDateTimeLocal(job.date)}
                                                onChange={(e) => handleUpdateJob(job.id, 'date', e.target.value)}
                                                style={{ width: '100%', background: 'transparent', border: 'none', color: 'white', fontSize: '0.9rem' }}
                                            />
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <input
                                                type="datetime-local"
                                                value={toDateTimeLocal(job.end_time)}
                                                onChange={(e) => handleUpdateJob(job.id, 'end_time', e.target.value)}
                                                style={{ width: '100%', background: 'transparent', border: 'none', color: 'white', fontSize: '0.9rem' }}
                                            />
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <input
                                                type="text"
                                                value={job.title}
                                                onChange={(e) => handleUpdateJob(job.id, 'title', e.target.value)}
                                                style={{ width: '100%', background: 'transparent', border: 'none', color: 'white', fontSize: '0.9rem' }}
                                            />
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <div style={{ width: '100%' }}>
                                                <LocationSelector
                                                    value={job.location}
                                                    onChange={(val) => handleUpdateJob(job.id, 'location', val)}
                                                />
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <span style={{ color: job.slots_taken >= job.slots_total ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
                                                    {job.slots_taken}
                                                </span>
                                                <span style={{ color: 'var(--color-text-muted)' }}>/</span>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={job.slots_total}
                                                    onChange={(e) => handleUpdateJob(job.id, 'slots_total', e.target.value)}
                                                    style={{ width: '60px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'white', fontSize: '0.9rem', padding: '0.25rem' }}
                                                />
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                {job.assigned_users.map(user => (
                                                    <div key={user.id} style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem',
                                                        background: 'var(--color-primary)',
                                                        padding: '0.2rem 0.5rem',
                                                        borderRadius: '4px',
                                                        fontSize: '0.8rem'
                                                    }}>
                                                        {user.full_name}
                                                        <button
                                                            onClick={() => handleRemoveUser(job.id, user.id)}
                                                            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0, display: 'flex' }}
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ maxWidth: '200px' }}>
                                                <button
                                                    onClick={() => setActiveJobIdForSelection(job.id)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: 'var(--radius-sm)',
                                                        border: '1px dashed var(--color-border)',
                                                        background: 'transparent',
                                                        color: 'var(--color-text-muted)',
                                                        cursor: 'pointer',
                                                        fontSize: '0.8rem',
                                                        width: '100%'
                                                    }}
                                                >
                                                    <Plus size={14} /> Hozzáadás
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                <tbody>
                                    {generateMatrixData().map((row, rowIndex) => (
                                        <tr key={rowIndex} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                            {row.map((cell, cellIndex) => (
                                                <td key={cellIndex} style={{
                                                    padding: '0.5rem',
                                                    borderRight: '1px solid var(--color-border)',
                                                    background: rowIndex < 4 ? 'rgba(255,255,255,0.05)' : 'transparent',
                                                    fontWeight: rowIndex < 4 ? 'bold' : 'normal',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {cell}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {jobs.length === 0 && (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                            Nincs munka ebben a hónapban.
                        </div>
                    )}
                </div>
            )}

            {activeJobIdForSelection && (
                <UserSelector
                    onSelect={(user) => handleAssignUser(activeJobIdForSelection, user)}
                    onClose={() => setActiveJobIdForSelection(null)}
                    excludeUserIds={jobs.find(j => j.id === activeJobIdForSelection)?.assigned_users.map(u => u.id) || []}
                />
            )}
        </div>
    );
};


export default JobTableEditor;
