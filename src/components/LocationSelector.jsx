import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { ChevronDown, X, Plus } from 'lucide-react';

const LocationSelector = ({ value, onChange }) => {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value || '');
    const wrapperRef = useRef(null);

    useEffect(() => {
        fetchLocations();
    }, []);

    useEffect(() => {
        setInputValue(value || '');
    }, [value]);

    useEffect(() => {
        // Close dropdown when clicking outside
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchLocations = async () => {
        try {
            const { data, error } = await supabase
                .from('locations')
                .select('*')
                .order('name');

            if (error) throw error;
            setLocations(data);
        } catch (error) {
            console.error('Error fetching locations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (name) => {
        const trimmedName = name.trim();
        if (!trimmedName) return;
        try {
            const { data, error } = await supabase
                .from('locations')
                .insert({ name: trimmedName })
                .select()
                .single();

            if (error) throw error;

            setLocations(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
            onChange(data.name);
            setIsOpen(false);
        } catch (error) {
            console.error('Error adding location:', error);
            alert('Nem sikerült hozzáadni a helyszínt');
        }
    };

    const handleDelete = async (e, id, name) => {
        e.stopPropagation(); // Prevent selection when deleting
        if (!confirm(`Törlöd a(z) "${name}" helyszínt?`)) return;
        try {
            const { error } = await supabase
                .from('locations')
                .delete()
                .eq('id', id);

            if (error) throw error;

            const newLocations = locations.filter(l => l.id !== id);
            setLocations(newLocations);

            // If deleted item was selected, clear selection
            if (value === name) {
                onChange('');
            }
        } catch (error) {
            console.error('Error deleting location:', error);
            alert('Nem sikerült törölni a helyszínt');
        }
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setInputValue(val);
        onChange(val); // Allow free text
        setIsOpen(true);
    };

    const handleSelect = (name) => {
        onChange(name);
        setInputValue(name);
        setIsOpen(false);
    };

    const filteredLocations = locations.filter(loc =>
        loc.name.toLowerCase().includes(inputValue.toLowerCase())
    );

    const showAddOption = inputValue && !locations.some(loc => loc.name.toLowerCase() === inputValue.toLowerCase());

    if (loading) return <div>Helyszínek betöltése...</div>;

    return (
        <div ref={wrapperRef} style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    placeholder="Válassz vagy írj be helyszínt..."
                    style={{
                        width: '100%',
                        padding: '0.5rem 2.5rem 0.5rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface)',
                        color: 'white'
                    }}
                />
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        position: 'absolute',
                        right: '0.5rem',
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    <ChevronDown size={16} />
                </button>
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 50,
                    marginTop: '0.25rem',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}>
                    {filteredLocations.map(loc => (
                        <div
                            key={loc.id}
                            onClick={() => handleSelect(loc.name)}
                            style={{
                                padding: '0.5rem',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                background: loc.name === value ? 'var(--color-surface-hover)' : 'transparent'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = loc.name === value ? 'var(--color-surface-hover)' : 'transparent'}
                        >
                            <span>{loc.name}</span>
                            <button
                                type="button"
                                onClick={(e) => handleDelete(e, loc.id, loc.name)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--color-text-muted)',
                                    cursor: 'pointer',
                                    padding: '0.25rem',
                                    borderRadius: '4px'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}

                    {showAddOption && (
                        <div
                            onClick={() => handleAdd(inputValue)}
                            style={{
                                padding: '0.5rem',
                                cursor: 'pointer',
                                color: 'var(--color-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                borderTop: '1px solid var(--color-border)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <Plus size={14} />
                            <span>"{inputValue}" hozzáadása a listához</span>
                        </div>
                    )}

                    {filteredLocations.length === 0 && !showAddOption && (
                        <div style={{ padding: '0.5rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                            Nincs találat
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default LocationSelector;
