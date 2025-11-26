import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import EditJobForm from './EditJobForm';
import UserSelector from './UserSelector';
import { Edit, Trash2, Eye, EyeOff, UserPlus, RefreshCw, AlertTriangle, AlertCircle } from 'lucide-react';

const JobCard = ({ job, onApply, isAdmin, hourlyRate = 1500 }) => {
    const { user } = useAuth();
    const [applying, setApplying] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [applicants, setApplicants] = useState([]);
    const [loadingApplicants, setLoadingApplicants] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showInvite, setShowInvite] = useState(false);

    const isFull = job.slots_taken >= job.slots_total;
    // If invited, we treat it as NOT applied for the button state, so they can click it.
    const hasApplied = job.has_applied && job.user_application_status !== 'invited';
    const isInvited = job.user_application_status === 'invited';

    // Urgent logic: Starts within 48h AND not full
    const start = new Date(job.date);
    const now = new Date();
    const hoursUntilStart = (start - now) / (1000 * 60 * 60);
    const isUrgent = hoursUntilStart <= 48 && hoursUntilStart > 0 && !isFull;

    const handleApply = async () => {
        // 48h warning confirmation
        const start = new Date(job.date);
        const now = new Date();
        const hoursUntilStart = (start - now) / (1000 * 60 * 60);

        const confirmMessage = `Figyelem! A munka kezdete előtt 48 órával adhatod le a műszakot, de 48 órán belül köteles vagy megjelenni.\n\nBiztosan jelentkezni szeretnél erre a munkára?`;

        if (!confirm(confirmMessage)) return;

        setApplying(true);
        try {
            if (isInvited) {
                // If invited, update status to approved (Auto-approve)
                const { error } = await supabase
                    .from('applications')
                    .update({ status: 'approved' })
                    .eq('job_id', job.id)
                    .eq('user_id', user.id);

                if (error) throw error;
            } else {
                // Normal application - Auto-approve
                const { error } = await supabase
                    .from('applications')
                    .insert({
                        job_id: job.id,
                        user_id: user.id,
                        status: 'approved'
                    });

                if (error) throw error;
            }

            onApply(); // Refresh list
            alert('Jelentkezés sikeres! A rendszer automatikusan elfogadta.');
        } catch (error) {
            console.error('Error applying:', error);
            alert(error.message);
        } finally {
            setApplying(false);
        }
    };

    const fetchApplicants = async () => {
        if (!expanded) {
            setExpanded(true);
            setLoadingApplicants(true);
            try {
                const { data, error } = await supabase
                    .from('applications')
                    .select(`
                *,
                profiles:user_id (full_name, email, strikes)
              `)
                    .eq('job_id', job.id)
                    .order('created_at', { ascending: true }); // Oldest first

                if (error) throw error;
                setApplicants(data);
            } catch (error) {
                console.error('Error fetching applicants:', error);
            } finally {
                setLoadingApplicants(false);
            }
        } else {
            setExpanded(false);
            setShowInvite(false);
        }
    };

    const handleStatusChange = async (applicationId, newStatus, userId) => {
        try {
            if (newStatus === 'rejected') {
                if (!confirm('Biztosan elutasítod? Ez törli a jelentkezést, így a felhasználó újra jelentkezhet.')) return;

                const { error } = await supabase
                    .from('applications')
                    .delete()
                    .eq('id', applicationId);

                if (error) throw error;

                // Remove from local state
                setApplicants(prev => prev.filter(app => app.id !== applicationId));
                alert('Jelentkezés elutasítva és törölve.');
            } else {
                const { error } = await supabase
                    .from('applications')
                    .update({ status: newStatus })
                    .eq('id', applicationId);

                if (error) throw error;

                // Notify user if accepted
                if (newStatus === 'approved') {
                    await supabase.from('notifications').insert({
                        user_id: userId,
                        type: 'info',
                        message: `Jelentkezésedet elfogadták a következő munkára: ${job.title}`,
                        related_job_id: job.id
                    });
                }

                setApplicants(prev => prev.map(app =>
                    app.id === applicationId ? { ...app, status: newStatus } : app
                ));

                if (newStatus === 'approved') {
                    onApply();
                }
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
        }
    };

    const handleInviteUser = async (selectedUser) => {
        try {
            // Check if already applied/invited
            const { data: existing } = await supabase
                .from('applications')
                .select('id')
                .eq('job_id', job.id)
                .eq('user_id', selectedUser.id)
                .single();

            if (existing) {
                alert('Ez a felhasználó már jelentkezett vagy meg lett hívva.');
                return;
            }

            // Create application with 'invited' status
            const { error: appError } = await supabase
                .from('applications')
                .insert({
                    job_id: job.id,
                    user_id: selectedUser.id,
                    status: 'invited'
                });

            if (appError) throw appError;

            // Create notification
            const { error: notifError } = await supabase
                .from('notifications')
                .insert({
                    user_id: selectedUser.id,
                    type: 'invite',
                    message: `Meghívást kaptál a következő munkára: ${job.title}`,
                    related_job_id: job.id
                });

            if (notifError) throw notifError;

            alert(`Meghívó elküldve neki: ${selectedUser.full_name}`);
            setShowInvite(false);
            if (expanded) fetchApplicants(); // Refresh list
        } catch (error) {
            console.error('Error inviting user:', error);
            alert('Nem sikerült meghívni a felhasználót: ' + error.message);
        }
    };

    const handleDeleteJob = async () => {
        if (!confirm('Biztosan TÖRÖLNI szeretnéd ezt a munkát? Ez nem visszavonható.')) return;
        try {
            const { error } = await supabase
                .from('jobs')
                .delete()
                .eq('id', job.id);

            if (error) throw error;
            onApply(); // Refresh list
        } catch (error) {
            console.error('Error deleting job:', error);
            alert('Failed to delete job');
        }
    };

    const handleToggleActive = async () => {
        try {
            const { error } = await supabase
                .from('jobs')
                .update({ is_active: !job.is_active })
                .eq('id', job.id);

            if (error) throw error;
            onApply(); // Refresh list
        } catch (error) {
            console.error('Error updating job status:', error);
            alert('Failed to update job status');
        }
    };

    const handleGiveAway = async (isEmergency = false) => {
        const message = isEmergency
            ? 'FIGYELEM! 48 órán belül vagy. A leadást az adminisztrátornak jóvá kell hagynia.\n\nBiztosan kérvényezed a sürgősségi leadást?'
            : 'Biztosan le szeretnéd adni a műszakot? Mások átvehetik a helyedet.';

        if (!confirm(message)) return;

        try {
            const updateData = isEmergency
                ? { emergency_giveaway_requested: true, give_away_requested_at: new Date().toISOString() }
                : { give_away_requested: true, give_away_requested_at: new Date().toISOString() };

            const { error } = await supabase
                .from('applications')
                .update(updateData)
                .eq('job_id', job.id)
                .eq('user_id', user.id);

            if (error) throw error;
            onApply();
            alert(isEmergency
                ? 'Sürgősségi leadás kérvényezve. Várj az adminisztrátor jóváhagyására.'
                : 'Műszak leadása kérvényezve. Amíg valaki át nem veszi, a te neveden van!'
            );
        } catch (error) {
            console.error('Error giving away job:', error);
            alert('Hiba történt: ' + error.message);
        }
    };

    const handleCancelGiveaway = async () => {
        if (!confirm('Biztosan visszavonod a műszak leadását?')) return;
        try {
            const { error } = await supabase
                .from('applications')
                .update({
                    give_away_requested: false,
                    emergency_giveaway_requested: false,
                    give_away_requested_at: null
                })
                .eq('job_id', job.id)
                .eq('user_id', user.id);

            if (error) throw error;
            onApply();
            alert('Műszak leadása visszavonva.');
        } catch (error) {
            console.error('Error cancelling giveaway:', error);
            alert('Hiba történt: ' + error.message);
        }
    };

    const handleApproveGiveaway = async (applicationId) => {
        if (!confirm('Jóváhagyod a műszak leadását? Ezzel elérhetővé teszed mások számára.')) return;
        try {
            const { error } = await supabase
                .from('applications')
                .update({
                    give_away_requested: true,
                    emergency_giveaway_requested: false // Clear the emergency flag as it's now approved
                })
                .eq('id', applicationId);

            if (error) throw error;
            if (expanded) fetchApplicants(); // Refresh list
            alert('Leadás jóváhagyva. A műszak mostantól átvehető.');
        } catch (error) {
            console.error('Error approving giveaway:', error);
            alert('Hiba történt: ' + error.message);
        }
    };

    const handleSwitchPlaces = async () => {
        if (!confirm('Szeretnéd átvenni a felszabadult helyet?')) return;
        try {
            const { data, error } = await supabase.rpc('claim_giveaway_spot', {
                job_id_param: job.id
            });

            if (error) throw error;
            if (!data.success) {
                alert(data.message);
                return;
            }

            onApply();
            alert(data.message);
        } catch (error) {
            console.error('Error switching places:', error);
            alert('Hiba történt: ' + error.message);
        }
    };

    return (
        <div className="glass-panel" style={{
            padding: '1.5rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
            opacity: !job.is_active ? 0.6 : 1,
            border: !job.is_active ? '1px dashed var(--color-text-muted)' : isUrgent ? '1px solid #ef4444' : 'none',
            position: 'relative'
        }}>
            {isEditing && (
                <EditJobForm
                    job={job}
                    onClose={() => setIsEditing(false)}
                    onJobUpdated={onApply}
                />
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>{job.title}</h3>
                        {!job.is_active && <span style={{ fontSize: '0.75rem', background: 'var(--color-danger)', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>INAKTÍV</span>}
                        {(() => {
                            const now = new Date();
                            const start = new Date(job.date);
                            const end = job.end_time ? new Date(job.end_time) : new Date(start.getTime() + 4 * 60 * 60 * 1000);
                            if (now >= start && now <= end) {
                                return (
                                    <span style={{
                                        fontSize: '0.75rem',
                                        background: 'var(--color-primary)',
                                        color: 'white',
                                        padding: '0.1rem 0.4rem',
                                        borderRadius: '4px',
                                        animation: 'pulse 2s infinite'
                                    }}>
                                        MOST ZAJLIK
                                    </span>
                                );
                            }
                            return null;
                        })()}
                        {job.has_giveaway_requests && (
                            <div title="Valaki le szeretné adni a műszakot!" style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: 'var(--color-warning)',
                                color: 'black',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: '1rem',
                                boxShadow: '0 0 10px rgba(234, 179, 8, 0.5)'
                            }}>
                                !
                            </div>
                        )}
                        {isUrgent && (
                            <div title="Sürgős! Kevesebb mint 48 óra van hátra és van szabad hely." style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: '#ef4444',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: '1rem',
                                boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)',
                                animation: 'pulse 1s infinite'
                            }}>
                                !
                            </div>
                        )}
                    </div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                        <span style={{ textTransform: 'capitalize' }}>
                            {new Date(job.date).toLocaleDateString('hu-HU', { weekday: 'long' })},
                        </span>{' '}
                        {new Date(job.date).toLocaleDateString()} • {new Date(job.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {job.end_time ? new Date(job.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '???'}
                        <br />
                        {job.location}
                        <br />
                        {(() => {
                            const start = new Date(job.date);
                            const end = job.end_time ? new Date(job.end_time) : new Date(start.getTime() + 4 * 60 * 60 * 1000);
                            const durationMs = end - start;
                            const durationHours = durationMs / (1000 * 60 * 60);
                            const pay = Math.round(durationHours * hourlyRate);

                            return (
                                <span style={{ color: 'var(--color-success)', fontWeight: 'bold', fontSize: '0.8rem', marginTop: '0.25rem', display: 'inline-block' }}>
                                    {durationHours.toFixed(1)} óra • {pay.toLocaleString('hu-HU')} Ft
                                </span>
                            );
                        })()}
                    </div>
                </div>
                <div style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '999px',
                    background: isFull ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: isFull ? '#fca5a5' : '#6ee7b7',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                }}>
                    {job.slots_taken} / {job.slots_total} Hely
                </div>
            </div>

            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>{job.description}</p>

            {!isAdmin ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button
                        onClick={job.has_giveaway_requests ? handleSwitchPlaces : handleApply}
                        disabled={(isFull && !job.has_giveaway_requests) || hasApplied || applying}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            border: 'none',
                            background: hasApplied ? 'var(--color-surface-hover)' : job.has_giveaway_requests ? 'var(--color-success)' : 'var(--color-primary)',
                            color: 'white',
                            fontWeight: 'bold',
                            cursor: ((isFull && !job.has_giveaway_requests) || hasApplied || applying) ? 'not-allowed' : 'pointer',
                            opacity: ((isFull && !job.has_giveaway_requests) || hasApplied || applying) ? 0.7 : 1
                        }}
                    >
                        {hasApplied ? 'Jelentkezve' : (isFull && !job.has_giveaway_requests) ? 'Betelt' : job.has_giveaway_requests ? 'Hely átvétele (Valaki leadta)' : applying ? 'Jelentkezés...' : 'Jelentkezés'}
                    </button>

                    {/* Cancel Giveaway Button (shows if ANY giveaway is requested) */}
                    {hasApplied && (job.give_away_requested || job.emergency_giveaway_requested) && (
                        <button
                            onClick={handleCancelGiveaway}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--color-text-muted)',
                                background: 'rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                marginTop: '0.5rem'
                            }}
                        >
                            Műszak leadás visszavonása
                        </button>
                    )}

                    {/* Give Away Button (only if NO giveaway requested) */}
                    {hasApplied && job.user_application_status === 'approved' && !job.give_away_requested && !job.emergency_giveaway_requested && (
                        (() => {
                            const start = new Date(job.date);
                            const now = new Date();
                            const hoursUntilStart = (start - now) / (1000 * 60 * 60);

                            if (hoursUntilStart > 48) {
                                return (
                                    <button
                                        onClick={() => handleGiveAway(false)}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid var(--color-warning)',
                                            background: 'rgba(234, 179, 8, 0.1)',
                                            color: 'var(--color-warning)',
                                            cursor: 'pointer',
                                            fontSize: '0.875rem'
                                        }}
                                    >
                                        Műszak Leadása
                                    </button>
                                );
                            } else {
                                return (
                                    <button
                                        onClick={() => handleGiveAway(true)}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid #ef4444',
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            color: '#ef4444',
                                            cursor: 'pointer',
                                            fontSize: '0.875rem'
                                        }}
                                    >
                                        Sürgősségi Leadás (Admin jóváhagyás szükséges)
                                    </button>
                                );
                            }
                        })()
                    )}

                    {/* Giveaway Status Indicators */}
                    {hasApplied && job.give_away_requested && (
                        <div style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-warning)', padding: '0.5rem', border: '1px dashed var(--color-warning)', borderRadius: 'var(--radius-sm)', marginTop: '0.5rem' }}>
                            Műszak leadása folyamatban...
                        </div>
                    )}
                    {hasApplied && job.emergency_giveaway_requested && (
                        <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#ef4444', padding: '0.5rem', border: '1px dashed #ef4444', borderRadius: 'var(--radius-sm)', marginTop: '0.5rem' }}>
                            Sürgősségi leadás elküldve. Adminra vár...
                        </div>
                    )}

                    {/* Emergency Giveaway Status Indicator - HIDDEN as per request */}
                    {/* {hasApplied && job.emergency_giveaway_requested && (
                            <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#ef4444', padding: '0.5rem', border: '1px dashed #ef4444', borderRadius: 'var(--radius-sm)' }}>
                                Sürgősségi leadás elküldve. Adminra vár...
                            </div>
                        )} */}


                </div>
            ) : (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                        <button
                            onClick={() => setIsEditing(true)}
                            style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'white', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.25rem' }}
                        >
                            <Edit size={16} /> Szerkesztés
                        </button>
                        <button
                            onClick={handleToggleActive}
                            style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'white', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.25rem' }}
                        >
                            {job.is_active ? <><EyeOff size={16} /> Elrejtés</> : <><Eye size={16} /> Megjelenítés</>}
                        </button>
                        <button
                            onClick={handleDeleteJob}
                            style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.25rem' }}
                        >
                            <Trash2 size={16} /> Törlés
                        </button>
                        <button
                            onClick={fetchApplicants}
                            style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'white', cursor: 'pointer' }}
                        >
                            {expanded ? 'Bezárás' : 'Jelentkezők'}
                        </button>
                    </div>

                    {expanded && (
                        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => setShowInvite(true)}
                                    style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--color-border)', background: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer', justifyContent: 'center' }}
                                >
                                    <UserPlus size={16} /> Hostess Meghívása
                                </button>
                                <button
                                    onClick={fetchApplicants}
                                    title="Lista frissítése"
                                    style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <RefreshCw size={16} />
                                </button>

                                {showInvite && (
                                    <UserSelector
                                        onSelect={handleInviteUser}
                                        onClose={() => setShowInvite(false)}
                                    />
                                )}
                            </div>

                            {loadingApplicants ? (
                                <p>Betöltés...</p>
                            ) : applicants.length === 0 ? (
                                <p style={{ color: 'var(--color-text-muted)' }}>Még nincs jelentkező.</p>
                            ) : (
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    {applicants.map(app => (
                                        <div key={app.id} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '0.5rem',
                                            background: 'rgba(0,0,0,0.2)',
                                            borderRadius: 'var(--radius-sm)'
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold' }}>{app.profiles?.full_name || 'Unknown'}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                    Strigulák: {app.profiles?.strikes || 0} • Státusz: {app.status === 'invited' ? 'MEGHÍVVA' : app.status}
                                                    {/* {app.emergency_giveaway_requested && <span style={{ color: '#ef4444', fontWeight: 'bold', marginLeft: '0.5rem' }}>⚠️ SÜRGŐSSÉGI LEADÁS!</span>} */}
                                                    <br />
                                                    Jelentkezett: {new Date(app.created_at).toLocaleString('hu-HU')}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                {app.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleStatusChange(app.id, 'approved', app.user_id)}
                                                            style={{ padding: '0.25rem 0.5rem', background: 'var(--color-success)', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}
                                                            title="Elfogadás"
                                                        >
                                                            ✓
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusChange(app.id, 'rejected', app.user_id)}
                                                            style={{ padding: '0.25rem 0.5rem', background: 'var(--color-danger)', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}
                                                            title="Elutasítás"
                                                        >
                                                            ✕
                                                        </button>
                                                    </>
                                                )}
                                                {app.status === 'invited' && (
                                                    <button
                                                        onClick={() => handleStatusChange(app.id, 'rejected', app.user_id)}
                                                        style={{ padding: '0.25rem 0.5rem', background: 'var(--color-danger)', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}
                                                        title="Meghívás visszavonása"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                                {app.status !== 'pending' && app.status !== 'invited' && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span style={{
                                                            fontSize: '0.875rem',
                                                            color: (app.give_away_requested || app.emergency_giveaway_requested) ? 'var(--color-warning)' : app.status === 'approved' ? '#10b981' : '#ef4444',
                                                            fontWeight: (app.give_away_requested || app.emergency_giveaway_requested) ? 'bold' : 'normal'
                                                        }}>
                                                            {(() => {
                                                                if (app.emergency_giveaway_requested) return 'SÜRGŐSSÉGI LEADÁS';
                                                                if (app.give_away_requested) return 'MŰSZAK LEADÁS ALATT';
                                                                return app.status.charAt(0).toUpperCase() + app.status.slice(1);
                                                            })()}
                                                        </span>
                                                        {/* Admin can remove approved users */}
                                                        {isAdmin && app.status === 'approved' && (
                                                            <button
                                                                onClick={() => handleStatusChange(app.id, 'rejected', app.user_id)}
                                                                style={{ padding: '0.25rem 0.5rem', background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '4px', color: '#ef4444', cursor: 'pointer' }}
                                                                title="Eltávolítás a munkából"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )
            }
        </div>
    );
};

export default JobCard;
