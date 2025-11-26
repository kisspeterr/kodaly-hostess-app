import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

const SettingsModal = ({ onClose, currentRate, onUpdate }) => {
    const [rate, setRate] = useState(currentRate);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase
                .from('settings')
                .update({ value: rate.toString() })
                .eq('key', 'hourly_rate');

            if (error) throw error;

            onUpdate(rate);
            onClose();
            alert('Beállítások sikeresen mentve!');
        } catch (error) {
            console.error('Error updating settings:', error);
            alert('Hiba történt: ' + error.message);
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
            zIndex: 9999,
            padding: '1rem',
            backdropFilter: 'blur(5px)'
        }}>
            <div className="glass-panel" style={{
                padding: '2rem',
                borderRadius: 'var(--radius-lg)',
                width: '100%',
                maxWidth: '400px',
                position: 'relative',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
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
                    <X size={20} />
                </button>

                <h2 style={{ marginTop: 0, marginBottom: '1.5rem', textAlign: 'center' }}>Beállítások</h2>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Órabér (Ft/óra)</label>
                        <input
                            type="number"
                            required
                            min="0"
                            value={rate}
                            onChange={e => setRate(e.target.value)}
                            style={{ width: '100%', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'white', fontSize: '1.25rem', textAlign: 'center' }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '0.75rem 1.5rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-border)',
                                background: 'transparent',
                                color: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            Mégse
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '0.75rem 1.5rem',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                background: 'var(--color-primary)',
                                color: 'white',
                                fontWeight: 'bold',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            {loading ? 'Mentés...' : 'Mentés'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default SettingsModal;
