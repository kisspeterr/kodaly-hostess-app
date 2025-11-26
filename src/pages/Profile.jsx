import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Calendar, Clock, MapPin } from 'lucide-react';
import JobDetailsModal from '../components/JobDetailsModal';

const Profile = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        hoursWorked: 0,
        earnings: 0,
        strikes: 0,
        jobsCompleted: 0,
        quizScore: 0,
        quizTotal: 0
    });
    const [applications, setApplications] = useState([]);
    const [giveawayQueues, setGiveawayQueues] = useState({}); // Map of jobId -> userRank/total
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedJob, setSelectedJob] = useState(null);
    const [statsTimeframe, setStatsTimeframe] = useState('all'); // 'all' | 'month'

    useEffect(() => {
        fetchData();
    }, [user, currentDate, statsTimeframe]);

    const fetchData = async () => {
        try {
            // Fetch profile for strikes and quiz score
            const { data: profileData } = await supabase
                .from('profiles')
                .select('strikes, quiz_score, quiz_total')
                .eq('id', user.id)
                .single();

            // Fetch total number of quiz questions
            const { count: questionCount } = await supabase
                .from('quiz_questions')
                .select('*', { count: 'exact', head: true });

            // Fetch all applications
            const { data: apps, error } = await supabase
                .from('applications')
                .select(`
          *,
          jobs (
            *
          )
        `)
                .eq('user_id', user.id);

            if (error) throw error;

            setApplications(apps);

            // Fetch Giveaway Queues for jobs where user requested giveaway
            const giveawayApps = apps.filter(app => app.give_away_requested || app.emergency_giveaway_requested);
            const queues = {};

            for (const app of giveawayApps) {
                const { data: queueData } = await supabase
                    .from('applications')
                    .select('user_id, give_away_requested_at')
                    .eq('job_id', app.job_id)
                    .or('give_away_requested.eq.true,emergency_giveaway_requested.eq.true')
                    .order('give_away_requested_at', { ascending: true });

                if (queueData) {
                    const rank = queueData.findIndex(q => q.user_id === user.id) + 1;
                    queues[app.job_id] = { rank, total: queueData.length };
                }
            }
            setGiveawayQueues(queues);

            // Calculate Stats
            const now = new Date();
            const approvedApps = apps.filter(app => app.status === 'approved');

            // Filter jobs based on timeframe
            const filteredApps = statsTimeframe === 'month'
                ? approvedApps.filter(app => {
                    const jobDate = new Date(app.jobs.date);
                    return jobDate.getMonth() === currentDate.getMonth() &&
                        jobDate.getFullYear() === currentDate.getFullYear();
                })
                : approvedApps;

            // Completed jobs (end_time in past) - from filtered set
            const completedJobs = filteredApps.filter(app => {
                const job = app.jobs;
                if (!job || !job.date) return false;
                const endTime = job.end_time
                    ? new Date(job.end_time)
                    : new Date(new Date(job.date).getTime() + 4 * 60 * 60 * 1000);
                return endTime < now;
            });

            const hours = completedJobs.reduce((acc, app) => {
                const job = app.jobs;
                if (job.end_time && job.date) {
                    const start = new Date(job.date);
                    const end = new Date(job.end_time);
                    const durationHours = (end - start) / (1000 * 60 * 60);
                    return acc + Math.max(0, durationHours);
                }
                return acc + 4;
            }, 0);

            const earnings = Math.round(hours * 2000);

            setStats({
                hoursWorked: Math.round(hours * 10) / 10,
                earnings: earnings,
                strikes: profileData?.strikes || 0,
                jobsCompleted: completedJobs.length,
                quizScore: profileData?.quiz_score || 0,
                quizTotal: questionCount || 0
            });

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
        // Adjust for Monday start (Monday=0, Sunday=6)
        const firstDayAdjusted = firstDay === 0 ? 6 : firstDay - 1;
        return { days, firstDay: firstDayAdjusted };
    };

    const { days, firstDay } = getDaysInMonth(currentDate);
    const monthNames = ['Január', 'Február', 'Március', 'Április', 'Május', 'Június', 'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'];

    const giveawayJobs = applications.filter(app => app.give_away_requested || app.emergency_giveaway_requested);
    const pendingJobs = applications.filter(app => app.status === 'pending' || app.status === 'invited');
    const upcomingJobs = applications.filter(app => {
        if (app.status !== 'approved') return false;
        const job = app.jobs;
        if (!job || !job.date) return false;
        const endTime = job.end_time
            ? new Date(job.end_time)
            : new Date(new Date(job.date).getTime() + 4 * 60 * 60 * 1000);
        return endTime > new Date();
    }).sort((a, b) => new Date(a.jobs.date) - new Date(b.jobs.date));

    // Helper to check if a day has a job
    const getJobForDay = (day) => {
        return upcomingJobs.find(app => {
            const jobDate = new Date(app.jobs.date);
            return jobDate.getDate() === day &&
                jobDate.getMonth() === currentDate.getMonth() &&
                jobDate.getFullYear() === currentDate.getFullYear();
        });
    };

    if (loading) return <div style={{ padding: '2rem' }}>Profil betöltése...</div>;

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Profile Header & Stats */}
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        color: 'white'
                    }}>
                        {user?.profile?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h1 style={{ margin: 0 }}>{user?.profile?.full_name || 'User'}</h1>
                        <p style={{ margin: '0.5rem 0 0 0', color: 'var(--color-text-muted)' }}>{user?.email}</p>
                        <div style={{ marginTop: '0.5rem' }}>
                            <span style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '999px',
                                background: 'var(--color-surface-hover)',
                                fontSize: '0.75rem',
                                color: 'var(--color-text-muted)'
                            }}>
                                {user?.profile?.role === 'admin' ? 'Adminisztrátor' : 'Hostess'}
                            </span>
                        </div>
                    </div>
                </div>


                {/* Stats Timeframe Toggle */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', padding: '0.25rem', display: 'flex' }}>
                        <button
                            onClick={() => setStatsTimeframe('all')}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: 'var(--radius-sm)',
                                border: 'none',
                                background: statsTimeframe === 'all' ? 'var(--color-primary)' : 'transparent',
                                color: statsTimeframe === 'all' ? 'white' : 'var(--color-text-muted)',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            Összes
                        </button>
                        <button
                            onClick={() => setStatsTimeframe('month')}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: 'var(--radius-sm)',
                                border: 'none',
                                background: statsTimeframe === 'month' ? 'var(--color-primary)' : 'transparent',
                                color: statsTimeframe === 'month' ? 'white' : 'var(--color-text-muted)',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            Havi ({monthNames[currentDate.getMonth()]})
                        </button>
                    </div>
                </div>

                <div className="grid-stack-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.5rem' }}>
                    <div style={{ padding: '1.5rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{stats.hoursWorked}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Ledolgozott órák</div>
                    </div>
                    <div style={{ padding: '1.5rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-success)' }}>{stats.earnings.toLocaleString()} Ft</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Kereset</div>
                    </div>
                    <div style={{ padding: '1.5rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-text)' }}>{stats.jobsCompleted}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Elvégzett munkák</div>
                    </div>
                    <div style={{ padding: '1.5rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: stats.strikes > 0 ? 'var(--color-danger)' : 'var(--color-text)' }}>{stats.strikes}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Strigulák</div>
                    </div>
                    <div style={{ padding: '1.5rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{stats.quizScore} / {stats.quizTotal}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Kvíz Rekord</div>
                    </div>
                </div>
            </div>

            <div className="grid-stack-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                {/* Left Column: Lists */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Upcoming Jobs */}
                    <div>
                        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Calendar size={20} /> Következő Munkák
                        </h3>
                        {upcomingJobs.length === 0 ? (
                            <div className="glass-panel" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', color: 'var(--color-text-muted)' }}>
                                Nincs közelgő munka.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {upcomingJobs.map(app => (
                                    <div key={app.id} className="glass-panel" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--color-success)' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{app.jobs.title}</div>
                                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <Calendar size={14} />
                                                {new Date(app.jobs.date).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric', weekday: 'short' })}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <Clock size={14} />
                                                {new Date(app.jobs.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Giveaway Queue */}
                    <div>
                        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={20} /> Műszak leadás alatt (Sorban állás)
                        </h3>
                        {giveawayJobs.length === 0 ? (
                            <div className="glass-panel" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', color: 'var(--color-text-muted)' }}>
                                Nincs folyamatban lévő műszak leadásod.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {giveawayJobs.map(app => (
                                    <div key={app.id} className="glass-panel" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--color-warning)' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{app.jobs.title}</div>
                                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <Calendar size={14} />
                                                {new Date(app.jobs.date).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <MapPin size={14} />
                                                {app.jobs.location}
                                            </div>
                                        </div>
                                        <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--color-warning)', fontWeight: 'bold' }}>
                                            Sorszám: {giveawayQueues[app.job_id]?.rank || '?'}/{giveawayQueues[app.job_id]?.total || '?'}
                                            {app.emergency_giveaway_requested && <span style={{ color: '#ef4444', marginLeft: '0.5rem' }}>(Sürgősségi)</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Calendar */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0 }}>Naptár ({monthNames[currentDate.getMonth()]})</h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                                style={{ background: 'var(--color-surface)', border: 'none', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                &lt;
                            </button>
                            <button
                                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                                style={{ background: 'var(--color-surface)', border: 'none', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                &gt;
                            </button>
                        </div>
                    </div>
                    <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', textAlign: 'center', marginBottom: '1rem', fontWeight: 'bold', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                            <div>H</div><div>K</div><div>Sz</div><div>Cs</div><div>P</div><div>Sz</div><div>V</div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
                            {Array.from({ length: firstDay }).map((_, i) => (
                                <div key={`empty-${i}`} />
                            ))}
                            {Array.from({ length: days }).map((_, i) => {
                                const day = i + 1;
                                const job = getJobForDay(day);
                                const isToday = new Date().getDate() === day &&
                                    new Date().getMonth() === currentDate.getMonth() &&
                                    new Date().getFullYear() === currentDate.getFullYear();

                                return (
                                    <div
                                        key={day}
                                        onClick={() => job && setSelectedJob(job.jobs)}
                                        style={{
                                            aspectRatio: '1',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: 'var(--radius-sm)',
                                            background: job ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                                            color: job ? 'white' : 'var(--color-text)',
                                            position: 'relative',
                                            cursor: job ? 'pointer' : 'default',
                                            fontSize: '0.9rem',
                                            border: isToday ? '2px solid var(--color-primary)' : 'none',
                                            boxShadow: isToday ? '0 0 10px rgba(var(--color-primary-rgb), 0.3)' : 'none'
                                        }}
                                        title={job ? job.jobs.title : ''}
                                    >
                                        {day}
                                        {job && (
                                            <div style={{ width: '4px', height: '4px', background: 'white', borderRadius: '50%', marginTop: '2px' }} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {
                selectedJob && (
                    <JobDetailsModal
                        job={selectedJob}
                        onClose={() => setSelectedJob(null)}
                        onApply={fetchData}
                    />
                )
            }
        </div >
    );
};

export default Profile;
