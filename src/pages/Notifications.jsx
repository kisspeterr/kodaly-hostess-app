import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Bell, Check, X } from 'lucide-react';

const Notifications = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();

        // Mark all as read when opening the page
        const markAllRead = async () => {
            if (user) {
                await supabase
                    .from('notifications')
                    .update({ read: true })
                    .eq('user_id', user.id)
                    .eq('read', false);
            }
        };
        markAllRead();
    }, [user]);

    const fetchNotifications = async () => {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setNotifications(data);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptInvite = async (notification) => {
        try {
            // 1. Check if application exists and what is the status
            const { data: app, error: fetchError } = await supabase
                .from('applications')
                .select('status')
                .eq('job_id', notification.related_job_id)
                .eq('user_id', user.id)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "Row not found"
                throw fetchError;
            }

            // If application doesn't exist, it might have been deleted (invitation withdrawn)
            if (!app) {
                alert('A meghívás már nem érvényes (valószínűleg visszavonták).');
                // Delete the stale notification
                await supabase.from('notifications').delete().eq('id', notification.id);
                setNotifications(prev => prev.filter(n => n.id !== notification.id));
                return;
            }

            // If already approved
            if (app.status === 'approved') {
                alert('Már elfogadtad ezt a meghívást.');
                await supabase.from('notifications').delete().eq('id', notification.id);
                setNotifications(prev => prev.filter(n => n.id !== notification.id));
                return;
            }

            // Update application status to approved
            const { error: appError } = await supabase
                .from('applications')
                .update({ status: 'approved' })
                .eq('job_id', notification.related_job_id)
                .eq('user_id', user.id);

            if (appError) throw appError;

            // Delete the notification
            const { error: notifError } = await supabase
                .from('notifications')
                .delete()
                .eq('id', notification.id);

            if (notifError) {
                console.error('Error deleting notification:', notifError);
                // Don't throw, just warn. The user is added to the job.
            }

            alert('Meghívás elfogadva! Most már látod a munkát a profilodban.');
            // Refresh notifications list
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
        } catch (error) {
            console.error('Error accepting invite:', error);
            alert('Nem sikerült elfogadni a meghívást: ' + error.message);
        }
    };

    const handleDeclineInvite = async (notification) => {
        if (!confirm('Biztosan elutasítod a meghívást?')) return;
        try {
            // Delete application
            const { error: appError } = await supabase
                .from('applications')
                .delete()
                .eq('job_id', notification.related_job_id)
                .eq('user_id', user.id);

            if (appError) throw appError;

            // Delete the notification
            const { error: notifError } = await supabase
                .from('notifications')
                .delete()
                .eq('id', notification.id);

            if (notifError) throw notifError;

            alert('Meghívás elutasítva.');
            // Refresh notifications list
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
        } catch (error) {
            console.error('Error declining invite:', error);
            alert('Nem sikerült elutasítani a meghívást.');
        }
    };

    const handleAcceptGiveaway = async (notification) => {
        if (!confirm('Jóváhagyod a sürgősségi leadást?')) return;
        try {
            // Approve the giveaway
            const { error: appError } = await supabase
                .from('applications')
                .update({
                    give_away_requested: true,
                    emergency_giveaway_requested: false
                })
                .eq('id', notification.related_application_id);

            if (appError) throw appError;

            // Delete the notification
            await supabase.from('notifications').delete().eq('id', notification.id);

            alert('Leadás jóváhagyva.');
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
        } catch (error) {
            console.error('Error accepting giveaway:', error);
            alert('Hiba történt: ' + error.message);
        }
    };

    const handleDeclineGiveaway = async (notification) => {
        if (!confirm('Elutasítod a sürgősségi leadást?')) return;
        try {
            // Reject the giveaway (reset flag)
            const { error: appError } = await supabase
                .from('applications')
                .update({
                    emergency_giveaway_requested: false
                })
                .eq('id', notification.related_application_id);

            if (appError) throw appError;

            // Delete the notification
            await supabase.from('notifications').delete().eq('id', notification.id);

            alert('Leadás elutasítva.');
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
        } catch (error) {
            console.error('Error declining giveaway:', error);
            alert('Hiba történt: ' + error.message);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
                <Bell /> Értesítések
            </h2>

            {loading ? (
                <p>Betöltés...</p>
            ) : notifications.length === 0 ? (
                <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                    <p style={{ color: 'var(--color-text-muted)' }}>Nincsenek értesítéseid.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {notifications.map(notif => (
                        <div key={notif.id} className="glass-panel" style={{
                            padding: '1.5rem',
                            borderRadius: 'var(--radius-md)',
                            borderLeft: notif.type === 'invite' ? '4px solid var(--color-primary)' : notif.type === 'emergency_giveaway' ? '4px solid #ef4444' : '4px solid var(--color-border)',
                            background: notif.read ? 'rgba(30, 41, 59, 0.4)' : 'rgba(30, 41, 59, 0.8)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem' }}>
                                <div>
                                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: notif.read ? 'normal' : 'bold' }}>
                                        {notif.message}
                                    </p>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                        {new Date(notif.created_at).toLocaleString('hu-HU')}
                                    </span>
                                </div>
                                {notif.type === 'invite' && (
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => handleAcceptInvite(notif)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.25rem',
                                                padding: '0.5rem 1rem',
                                                borderRadius: 'var(--radius-sm)',
                                                border: 'none',
                                                background: 'var(--color-success)',
                                                color: 'white',
                                                cursor: 'pointer',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            <Check size={16} /> Elfogadás
                                        </button>
                                        <button
                                            onClick={() => handleDeclineInvite(notif)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.25rem',
                                                padding: '0.5rem 1rem',
                                                borderRadius: 'var(--radius-sm)',
                                                border: '1px solid #ef4444',
                                                background: 'transparent',
                                                color: '#ef4444',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <X size={16} /> Elutasítás
                                        </button>
                                    </div>
                                )}
                                {notif.type === 'emergency_giveaway' && (
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => handleAcceptGiveaway(notif)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.25rem',
                                                padding: '0.5rem 1rem',
                                                borderRadius: 'var(--radius-sm)',
                                                border: 'none',
                                                background: 'var(--color-success)',
                                                color: 'white',
                                                cursor: 'pointer',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            <Check size={16} /> Jóváhagyás
                                        </button>
                                        <button
                                            onClick={() => handleDeclineGiveaway(notif)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.25rem',
                                                padding: '0.5rem 1rem',
                                                borderRadius: 'var(--radius-sm)',
                                                border: '1px solid #ef4444',
                                                background: 'transparent',
                                                color: '#ef4444',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <X size={16} /> Elutasítás
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Notifications;
