import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Clock, MapPin } from 'lucide-react';

const HostessSchedule = () => {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    const months = [
        'Január', 'Február', 'Március', 'Április', 'Május', 'Június',
        'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'
    ];

    const years = Array.from({ length: 2 }, (_, i) => new Date().getFullYear() + i); // Current + next year

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

            // Filter applications to only show approved ones
            const formattedJobs = jobsData.map(job => ({
                ...job,
                assigned_users: job.applications
                    .filter(app => app.status === 'approved')
                    .map(app => app.profiles)
            }));

            setJobs(formattedJobs);
        } catch (error) {
            console.error('Error fetching jobs:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateMatrixData = () => {
        if (jobs.length === 0) return [];

        // Sort jobs by date
        const sortedJobs = [...jobs].sort((a, b) => new Date(a.date) - new Date(b.date));

        // Find max slots to determine number of rows
        const maxSlots = Math.max(...sortedJobs.map(j => j.slots_total), 0);

        // Build Rows
        const rows = [];

        // Row 1: Dates
        const dateRow = sortedJobs.map(job => {
            const date = new Date(job.date);
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const weekday = date.toLocaleDateString('hu-HU', { weekday: 'short' });
            return `${month}.${day}.${weekday}`;
        });
        rows.push(['Dátum', ...dateRow]);

        // Row 2: Titles
        const titleRow = sortedJobs.map(job => job.title);
        rows.push(['Esemény', ...titleRow]);

        // Row 3: Times
        const timeRow = sortedJobs.map(job => {
            const start = new Date(job.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const end = job.end_time ? new Date(job.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '???';
            return `${start}-${end}`;
        });
        rows.push(['Időpont', ...timeRow]);

        // Row 4: Locations
        const locationRow = sortedJobs.map(job => job.location);
        rows.push(['Helyszín', ...locationRow]);

        // Rows 5+: Hostesses
        for (let i = 0; i < maxSlots; i++) {
            const row = [`${i + 1}. Hostess`];

            sortedJobs.forEach(job => {
                const assigned = job.assigned_users || [];
                const user = assigned[i];
                if (user) {
                    row.push(user.full_name);
                } else {
                    row.push('-');
                }
            });
            rows.push(row);
        }
        return rows;
    };

    const matrixData = generateMatrixData();

    return (
        <div style={{ padding: '2rem', maxWidth: '100%', overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h1 style={{ margin: 0 }}>Beosztások</h1>

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
                </div>
            </div>

            {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>Betöltés...</div>
            ) : jobs.length === 0 ? (
                <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    Nincs beosztás erre a hónapra.
                </div>
            ) : (
                <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <tbody>
                            {matrixData.map((row, rowIndex) => (
                                <tr key={rowIndex} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    {row.map((cell, cellIndex) => (
                                        <td key={cellIndex} style={{
                                            padding: '0.75rem',
                                            borderRight: '1px solid var(--color-border)',
                                            background: cellIndex === 0 ? 'rgba(0,0,0,0.2)' : (rowIndex < 4 ? 'rgba(255,255,255,0.05)' : 'transparent'),
                                            fontWeight: (cellIndex === 0 || rowIndex < 4) ? 'bold' : 'normal',
                                            whiteSpace: 'nowrap',
                                            minWidth: cellIndex === 0 ? '150px' : '180px',
                                            color: (rowIndex >= 4 && cell === '-') ? 'var(--color-text-muted)' : 'var(--color-text)'
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
        </div>
    );
};

export default HostessSchedule;
