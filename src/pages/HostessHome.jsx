import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Calendar as CalendarIcon, Clock, DollarSign, MapPin } from 'lucide-react';

const HostessHome = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({ hours: 0, earnings: 0 });
    const [myJobs, setMyJobs] = useState([]);
    const [allJobs, setAllJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    const currentDate = new Date();
    const currentMonthName = currentDate.toLocaleDateString('hu-HU', { month: 'long' });
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
            const endOfMonth = new Date(currentYear, currentMonth + 1, 1).toISOString();

            // Fetch all jobs for the month
            const { data: jobsData, error: jobsError } = await supabase
                .from('jobs')
                .select(`
                    *,
                    applications (
                        status,
                        user_id
                    )
                `)
                .gte('date', startOfMonth)
                .lt('date', endOfMonth)
                .order('date', { ascending: true });

            if (jobsError) throw jobsError;

            // Process data
            let totalHours = 0;
            let totalEarnings = 0;
            const myJobsList = [];

            jobsData.forEach(job => {
                const myApp = job.applications.find(app => app.user_id === user.id && app.status === 'approved');

                if (myApp) {
                    const start = new Date(job.date);
                    const end = job.end_time ? new Date(job.end_time) : new Date(start.getTime() + 4 * 60 * 60 * 1000); // Default 4h
                    const durationHours = (end - start) / (1000 * 60 * 60);

                    totalHours += durationHours;
                    totalEarnings += Math.round(durationHours * 1500); // Assuming 1500 Ft/hr

                    myJobsList.push(job);
                }
            });

            setStats({ hours: totalHours, earnings: totalEarnings });
            setMyJobs(myJobsList);
            setAllJobs(jobsData);

        } catch (error) {
            console.error('Error fetching home data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calendar Helper Functions
    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => {
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; // Adjust for Monday start (0=Mon, 6=Sun)
    };

    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(currentYear, currentMonth);
        const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
        const days = [];

        // Empty cells for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.02)' }}></div>);
        }

        // Days of month
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = new Date(currentYear, currentMonth, i).toISOString().split('T')[0];
            const dayJobs = allJobs.filter(job => job.date.startsWith(dateStr));
            const isToday = i === currentDate.getDate();

            days.push(
                <div key={i} style={{
                    padding: '0.5rem',
                    background: isToday ? 'rgba(var(--color-primary-rgb), 0.1)' : 'rgba(255,255,255,0.05)',
                    border: isToday ? '1px solid var(--color-primary)' : '1px solid transparent',
                    borderRadius: 'var(--radius-sm)',
                    minHeight: '80px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem'
                }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', color: isToday ? 'var(--color-primary)' : 'inherit' }}>{i}</div>
                    {dayJobs.map(job => {
                        const isMine = myJobs.some(mj => mj.id === job.id);
                        return (
                            <div key={job.id} style={{
                                fontSize: '0.7rem',
                                padding: '0.1rem 0.3rem',
                                borderRadius: '2px',
                                background: isMine ? 'var(--color-success)' : 'var(--color-primary)',
                                color: 'white',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                cursor: 'pointer'
                            }} title={job.title}>
                                {job.title}
                            </div>
                        );
                    })}
                </div>
            );
        }

        return days;
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Greeting & Stats */}
            <div style={{ marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                    Szia, <span style={{ color: 'var(--color-primary)' }}>{user?.profile?.full_name?.split(' ')[1] || user?.profile?.full_name}</span>! 👋
                </h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>
                    Itt a <span style={{ textTransform: 'capitalize', color: 'white', fontWeight: 'bold' }}>{currentMonthName}</span> havi összesítőd.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
                    <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.2)', borderRadius: '50%', color: '#10b981' }}>
                            <Clock size={32} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Ledolgozott órák</div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.hours.toFixed(1)} óra</div>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '1rem', background: 'rgba(234, 179, 8, 0.2)', borderRadius: '50%', color: '#eab308' }}>
                            <DollarSign size={32} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Becsült kereset</div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.earnings.toLocaleString('hu-HU')} Ft</div>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
                {/* Calendar Section */}
                <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <CalendarIcon /> Naptár
                    </h2>
                    <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', marginBottom: '0.5rem', textAlign: 'center', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>
                            <div>H</div><div>K</div><div>Sze</div><div>Cs</div><div>P</div><div>Szo</div><div>V</div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
                            {renderCalendar()}
                        </div>
                    </div>
                </div>

                {/* My Jobs List */}
                <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <MapPin /> Munkáim
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {myJobs.length === 0 ? (
                            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                Nincs munkád ebben a hónapban.
                            </div>
                        ) : (
                            myJobs.map(job => (
                                <div key={job.id} className="glass-panel" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--color-success)' }}>
                                    <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{job.title}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                                        {new Date(job.date).toLocaleDateString('hu-HU')} • {new Date(job.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div style={{ fontSize: '0.85rem' }}>{job.location}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HostessHome;
