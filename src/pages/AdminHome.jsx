import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Briefcase, FileText, Calendar, ArrowRight, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminHome = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeJobs: 0,
        pendingGiveaways: 0
    });
    const [upcomingJobs, setUpcomingJobs] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // 1. Stats
            const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'hostess');
            const { count: jobCount } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).gte('date', new Date().toISOString());

            // Count pending giveaways (either normal or emergency)
            const { count: giveawayCount } = await supabase
                .from('applications')
                .select('*', { count: 'exact', head: true })
                .or('give_away_requested.eq.true,emergency_giveaway_requested.eq.true');

            setStats({
                totalUsers: userCount || 0,
                activeJobs: jobCount || 0,
                pendingGiveaways: giveawayCount || 0
            });

            // 2. Upcoming Jobs (Next 5)
            const { data: jobs } = await supabase
                .from('jobs')
                .select('*')
                .gte('date', new Date().toISOString())
                .order('date', { ascending: true })
                .limit(5);

            setUpcomingJobs(jobs || []);

            // 3. Recent Activity (Latest 5 applications)
            const { data: activities } = await supabase
                .from('applications')
                .select(`
                    created_at,
                    status,
                    jobs (title),
                    profiles (full_name)
                `)
                .order('created_at', { ascending: false })
                .limit(5);

            setRecentActivity(activities || []);

        } catch (error) {
            console.error('Error fetching admin dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ icon: Icon, label, value, color, link }) => (
        <Link to={link} style={{ textDecoration: 'none' }}>
            <div className="glass-panel" style={{
                padding: '1.5rem',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'center',
                gap: '1.5rem',
                transition: 'transform 0.2s',
                cursor: 'pointer'
            }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
                <div style={{
                    padding: '1rem',
                    borderRadius: '50%',
                    background: `rgba(${color}, 0.2)`,
                    color: `rgb(${color})`
                }}>
                    <Icon size={32} />
                </div>
                <div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>{label}</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>{value}</div>
                </div>
            </div>
        </Link>
    );

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '2rem' }}>Admin Vezérlőpult</h1>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                <StatCard
                    icon={Users}
                    label="Összes Hostess"
                    value={stats.totalUsers}
                    color="59, 130, 246" // Blue
                    link="/users"
                />
                <StatCard
                    icon={Briefcase}
                    label="Aktív Munkák"
                    value={stats.activeJobs}
                    color="16, 185, 129" // Green
                    link="/jobs"
                />
                <StatCard
                    icon={FileText}
                    label="Függőben leadott"
                    value={stats.pendingGiveaways}
                    color="239, 68, 68" // Red
                    link="/jobs"
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                {/* Upcoming Jobs */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                            <Calendar /> Következő Munkák
                        </h2>
                        <Link to="/" style={{ color: 'var(--color-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem' }}>
                            Összes megtekintése <ArrowRight size={16} />
                        </Link>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {upcomingJobs.length === 0 ? (
                            <p style={{ color: 'var(--color-text-muted)' }}>Nincs közelgő munka.</p>
                        ) : (
                            upcomingJobs.map(job => (
                                <div key={job.id} className="glass-panel" style={{
                                    padding: '1.25rem',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.25rem' }}>{job.title}</div>
                                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                            {new Date(job.date).toLocaleDateString('hu-HU')} • {job.location}
                                        </div>
                                    </div>
                                    <div style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '999px',
                                        background: job.slots_taken >= job.slots_total ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                        color: job.slots_taken >= job.slots_total ? '#fca5a5' : '#6ee7b7',
                                        fontSize: '0.8rem',
                                        fontWeight: 'bold'
                                    }}>
                                        {job.slots_taken} / {job.slots_total}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Recent Activity */}
                <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <Activity /> Legutóbbi Aktivitás
                    </h2>
                    <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {recentActivity.length === 0 ? (
                                <p style={{ color: 'var(--color-text-muted)' }}>Nincs friss aktivitás.</p>
                            ) : (
                                recentActivity.map((activity, index) => (
                                    <div key={index} style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
                                        <div style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: 'var(--color-primary)',
                                            marginTop: '0.4rem'
                                        }}></div>
                                        <div>
                                            <div style={{ fontSize: '0.9rem' }}>
                                                <span style={{ fontWeight: 'bold' }}>{activity.profiles?.full_name}</span> jelentkezett a <span style={{ fontWeight: 'bold' }}>{activity.jobs?.title}</span> munkára.
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                                                {new Date(activity.created_at).toLocaleString('hu-HU')}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminHome;
