import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import LocationSelector from './LocationSelector';
import { X } from 'lucide-react';

import { createPortal } from 'react-dom';

const EditJobForm = ({ job, onClose, onJobUpdated }) => {
    // ... existing state and logic ...
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        date: '',
        end_time: '',
        location: '',
        slots_total: 0,
        description: ''
    });

    useEffect(() => {
        if (job) {
            // Format dates for datetime-local input
            const formatDate = (dateString) => {
                if (!dateString) return '';
                const date = new Date(dateString);
                return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
            };

            setFormData({
                title: job.title,
                date: formatDate(job.date),
                end_time: formatDate(job.end_time),
                location: job.location,
                slots_total: job.slots_total,
                description: job.description || ''
            });
        }
    }, [job]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase
                .from('jobs')
                .update({
                    title: formData.title,
                    date: new Date(formData.date).toISOString(),
                    end_time: new Date(formData.end_time).toISOString(),
                    location: formData.location,
                    slots_total: parseInt(formData.slots_total),
                    description: formData.description
                })
                .eq('id', job.id);

            if (error) throw error;

            onJobUpdated();
            onClose();
            alert('Munka sikeresen frissítve!');
        } catch (error) {
            console.error('Error updating job:', error);
            alert('Nem sikerült frissíteni a munkát: ' + error.message);
        } finally {
            setLoading(false);
        }
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
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999, // Increased z-index
            padding: '1rem',
            backdropFilter: 'blur(5px)' // Add blur effect
        }}>
            <div className="glass-panel" style={{
                padding: '2.5rem', // Increased padding
                borderRadius: 'var(--radius-lg)',
                width: '100%',
                maxWidth: '800px', // Increased max-width
                position: 'relative',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' // Stronger shadow
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1.5rem',
                        right: '1.5rem',
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <X size={24} />
                </button>

                <h2 style={{ marginTop: 0, marginBottom: '2rem', fontSize: '1.75rem', textAlign: 'center' }}>Munka Szerkesztése</h2>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Munka Címe</label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            style={{ width: '100%', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'white', fontSize: '1rem' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Kezdés</label>
                            <input
                                type="datetime-local"
                                required
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                style={{ width: '100%', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'white' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Befejezés</label>
                            <input
                                type="datetime-local"
                                required
                                value={formData.end_time}
                                onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                                style={{ width: '100%', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'white' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Helyszín</label>
                            <LocationSelector
                                value={formData.location}
                                onChange={(val) => setFormData({ ...formData, location: val })}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Összes Hely</label>
                            <input
                                type="number"
                                min="1"
                                required
                                value={formData.slots_total}
                                onChange={e => setFormData({ ...formData, slots_total: e.target.value })}
                                style={{ width: '100%', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'white' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Leírás</label>
                        <textarea
                            rows="5"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            style={{ width: '100%', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'white', resize: 'vertical', fontSize: '1rem' }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '1rem 2rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-border)',
                                background: 'transparent',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '1rem'
                            }}
                        >
                            Mégse
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '1rem 2rem',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                background: 'var(--color-primary)',
                                color: 'white',
                                fontWeight: 'bold',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.7 : 1,
                                fontSize: '1rem'
                            }}
                        >
                            {loading ? 'Frissítés...' : 'Mentés'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default EditJobForm;
