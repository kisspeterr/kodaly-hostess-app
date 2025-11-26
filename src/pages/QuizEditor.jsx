import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, X, Trash2, Edit2, Upload, Check } from 'lucide-react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import imageCompression from 'browser-image-compression';

const QuizEditor = () => {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        question: '',
        answers: ['', '', '', ''],
        correct_answer_index: 0,
        image_url: ''
    });

    // Cropper State
    const [imageSrc, setImageSrc] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchQuestions();
    }, []);

    const fetchQuestions = async () => {
        try {
            const { data, error } = await supabase
                .from('quiz_questions')
                .select('*')
                .order('created_at');

            if (error) throw error;
            setQuestions(data);
        } catch (error) {
            console.error('Error fetching questions:', error);
        } finally {
            setLoading(false);
        }
    };

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const readFile = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.addEventListener('load', () => resolve(reader.result), false);
            reader.readAsDataURL(file);
        });
    };

    const handleFileSelect = async (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const imageDataUrl = await readFile(file);
            setImageSrc(imageDataUrl);
        }
    };

    const createImage = (url) =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            image.setAttribute('crossOrigin', 'anonymous');
            image.src = url;
        });

    const getCroppedImg = async (imageSrc, pixelCrop) => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            return null;
        }

        // set canvas size to match the bounding box
        canvas.width = image.width;
        canvas.height = image.height;

        // draw image
        ctx.drawImage(image, 0, 0);

        // croppedAreaPixels values are bounding box relative
        // extract the cropped image using these values
        const data = ctx.getImageData(
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height
        );

        // set canvas width to final desired crop size - this will clear existing context
        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        // paste generated rotate image at the top left corner
        ctx.putImageData(data, 0, 0);

        // As Blob
        return new Promise((resolve, reject) => {
            canvas.toBlob((file) => {
                resolve(file);
            }, 'image/jpeg', 0.9); // High quality jpeg
        });
    };

    const handleCropSave = async () => {
        try {
            setUploading(true);
            const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);

            // Compress
            const options = {
                maxSizeMB: 0.05, // 50KB
                maxWidthOrHeight: 800,
                useWebWorker: true
            };

            const compressedFile = await imageCompression(croppedBlob, options);
            console.log('Original size:', croppedBlob.size / 1024, 'KB');
            console.log('Compressed size:', compressedFile.size / 1024, 'KB');

            // Upload
            const fileName = `${Math.random()}.jpg`;
            const { error: uploadError } = await supabase.storage
                .from('quiz-images')
                .upload(fileName, compressedFile);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('quiz-images')
                .getPublicUrl(fileName);

            setFormData({ ...formData, image_url: data.publicUrl });
            setImageSrc(null); // Close cropper
        } catch (error) {
            console.error('Error processing image:', error);
            alert('Hiba a kép feldolgozása során.');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                const { error } = await supabase
                    .from('quiz_questions')
                    .update(formData)
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('quiz_questions')
                    .insert([formData]);
                if (error) throw error;
            }

            resetForm();
            fetchQuestions();
            alert('Kérdés mentve!');
        } catch (error) {
            console.error('Error saving question:', error);
            alert('Nem sikerült menteni a kérdést');
        }
    };

    const handleEdit = (q) => {
        setEditingId(q.id);
        setFormData({
            question: q.question,
            answers: q.answers,
            correct_answer_index: q.correct_answer_index,
            image_url: q.image_url || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation(); // Prevent opening modal
        if (!confirm('Törlöd ezt a kérdést?')) return;
        try {
            // 1. Get image URL to delete
            const { data: question, error: fetchError } = await supabase
                .from('quiz_questions')
                .select('image_url')
                .eq('id', id)
                .single();

            if (fetchError) throw fetchError;

            // 2. Delete from DB
            const { error } = await supabase
                .from('quiz_questions')
                .delete()
                .eq('id', id);
            if (error) throw error;

            // 3. Delete image from storage if exists
            if (question.image_url) {
                const urlParts = question.image_url.split('/');
                const fileName = urlParts[urlParts.length - 1];
                if (fileName) {
                    await supabase.storage
                        .from('quiz-images')
                        .remove([fileName]);
                }
            }

            fetchQuestions();
        } catch (error) {
            console.error('Error deleting question:', error);
            alert('Nem sikerült törölni a kérdést');
        }
    };

    const updateAnswer = (index, value) => {
        const newAnswers = [...formData.answers];
        newAnswers[index] = value;
        setFormData({ ...formData, answers: newAnswers });
    };

    const resetForm = () => {
        setFormData({
            question: '',
            answers: ['', '', '', ''],
            correct_answer_index: 0,
            image_url: ''
        });
        setEditingId(null);
        setShowModal(false);
        setImageSrc(null);
    };

    if (loading) return <div>Szerkesztő betöltése...</div>;

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ margin: 0 }}>Kvíz Szerkesztő</h1>
                <a href="/quiz" style={{
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-primary)',
                    color: 'white',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                }}>
                    Kvíz Megtekintése
                </a>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {/* Add New Card */}
                <div
                    onClick={() => {
                        resetForm();
                        setShowModal(true);
                    }}
                    style={{
                        border: '2px dashed var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '200px',
                        cursor: 'pointer',
                        color: 'var(--color-text-muted)',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-primary)';
                        e.currentTarget.style.color = 'var(--color-primary)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-border)';
                        e.currentTarget.style.color = 'var(--color-text-muted)';
                    }}
                >
                    <Plus size={48} />
                    <span style={{ marginTop: '1rem', fontWeight: 'bold' }}>Új Kérdés Hozzáadása</span>
                </div>

                {/* Question Cards */}
                {questions.map((q, idx) => (
                    <div
                        key={q.id}
                        className="glass-panel"
                        onClick={() => handleEdit(q)}
                        style={{
                            padding: '1.5rem',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'transform 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{idx + 1}. Kérdés</span>
                            <button
                                onClick={(e) => handleDelete(q.id, e)}
                                style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: 'none',
                                    color: '#ef4444',
                                    padding: '0.5rem',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer'
                                }}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        <h3 style={{ margin: 0, fontSize: '1.1rem', lineHeight: '1.4' }}>{q.question}</h3>

                        {q.image_url && (
                            <img
                                src={q.image_url}
                                alt="Question"
                                style={{
                                    width: '100%',
                                    height: '150px',
                                    objectFit: 'cover',
                                    borderRadius: 'var(--radius-sm)'
                                }}
                            />
                        )}

                        <div style={{ marginTop: 'auto', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                            Helyes válasz: <span style={{ color: 'var(--color-text)' }}>{q.answers[q.correct_answer_index]}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showModal && createPortal(
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '1rem'
                }}>
                    <div style={{
                        background: 'var(--color-bg)',
                        padding: '2rem',
                        borderRadius: 'var(--radius-lg)',
                        width: '100%',
                        maxWidth: '600px',
                        position: 'relative',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <button
                            onClick={resetForm}
                            style={{
                                position: 'absolute',
                                top: '1rem',
                                right: '1rem',
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-text-muted)',
                                cursor: 'pointer'
                            }}
                        >
                            <X size={24} />
                        </button>

                        <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>
                            {editingId ? 'Kérdés Szerkesztése' : 'Új Kérdés Hozzáadása'}
                        </h2>

                        <form onSubmit={handleSave} style={{ display: 'grid', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Kérdés</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.question}
                                    onChange={e => setFormData({ ...formData, question: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'white' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Kép (Opcionális)</label>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileSelect}
                                        disabled={uploading}
                                        style={{ color: 'white' }}
                                    />
                                    {uploading && <span>Feldolgozás...</span>}
                                </div>
                                {formData.image_url && !imageSrc && (
                                    <div style={{ marginTop: '0.5rem', position: 'relative', display: 'inline-block' }}>
                                        <img src={formData.image_url} alt="Preview" style={{ maxHeight: '150px', borderRadius: '4px' }} />
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, image_url: '' })}
                                            style={{
                                                position: 'absolute',
                                                top: -5,
                                                right: -5,
                                                background: 'red',
                                                color: 'white',
                                                borderRadius: '50%',
                                                width: '20px',
                                                height: '20px',
                                                border: 'none',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '12px'
                                            }}
                                        >
                                            X
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Válaszok (Jelöld be a helyeset)</label>
                                {formData.answers.map((ans, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                                        <input
                                            type="radio"
                                            name="correct"
                                            checked={formData.correct_answer_index === idx}
                                            onChange={() => setFormData({ ...formData, correct_answer_index: idx })}
                                            style={{ width: '20px', height: '20px', accentColor: 'var(--color-primary)' }}
                                        />
                                        <input
                                            type="text"
                                            required
                                            value={ans}
                                            onChange={e => updateAnswer(idx, e.target.value)}
                                            placeholder={`Válasz ${idx + 1}`}
                                            style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'white' }}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button
                                    type="submit"
                                    style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--color-primary)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    {editingId ? 'Mentés' : 'Hozzáadás'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Cropper Modal */}
            {imageSrc && createPortal(
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'black',
                    zIndex: 2000,
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                        />
                    </div>
                    <div style={{ padding: '1rem', background: 'var(--color-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ color: 'white' }}>
                            Állítsd be a négyzetes kivágást
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => setImageSrc(null)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--color-border)',
                                    background: 'transparent',
                                    color: 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                Mégse
                            </button>
                            <button
                                onClick={handleCropSave}
                                disabled={uploading}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: 'var(--radius-sm)',
                                    border: 'none',
                                    background: 'var(--color-primary)',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                {uploading ? 'Feldolgozás...' : <><Check size={18} /> Mentés</>}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default QuizEditor;
