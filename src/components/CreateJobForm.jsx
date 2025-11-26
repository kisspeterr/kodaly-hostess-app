import { useState } from 'react';
import { supabase } from '../lib/supabase';
import LocationSelector from './LocationSelector';

const CreateJobForm = ({ onJobCreated }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        date: '', // This will serve as start_time
        end_time: '',
        location: '',
        slots_total: 1,
        description: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Validate dates
        if (new Date(formData.end_time) <= new Date(formData.date)) {
            alert('A befejezésnek a kezdés után kell lennie');
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase
                .from('jobs')
                .insert([{
                    title: formData.title,
                    date: formData.date, // Mapping to 'date' column in DB which acts as start_time
                    end_time: formData.end_time,
                    location: formData.location,
                    slots_total: formData.slots_total,
                    description: formData.description
                }]);

            if (error) throw error;

            setFormData({
                title: '',
                date: '',
                end_time: '',
                location: '',
                slots_total: 1,
                description: ''
            });
            onJobCreated();
            alert('Munka sikeresen létrehozva!');
        } catch (error) {
            console.error('Error creating job:', error);
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }}>
            <h3 style={{ marginTop: 0 }}>Új Munka Létrehozása</h3>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Cím</label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'white' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Helyszín</label>
                        <LocationSelector
                            value={formData.location}
                            onChange={val => setFormData({ ...formData, location: val })}
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Kezdés</label>
                        <input
                            type="datetime-local"
                            required
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'white' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Befejezés</label>
                        <input
                            type="datetime-local"
                            required
                            value={formData.end_time}
                            onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'white' }}
                        />
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Helyek száma</label>
                    <input
                        type="number"
                        min="1"
                        required
                        value={formData.slots_total}
                        onChange={e => setFormData({ ...formData, slots_total: parseInt(e.target.value) })}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'white' }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Leírás</label>
                    <textarea
                        rows="3"
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'white' }}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--color-primary)', color: 'white', fontWeight: 'bold' }}
                >
                    {loading ? 'Létrehozás...' : 'Munka Létrehozása'}
                </button>
            </form>
        </div>
    );
};

export default CreateJobForm;
