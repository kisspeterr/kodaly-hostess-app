import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Landing = () => {
    const { user } = useAuth();

    if (user) {
        return <Navigate to="/home" replace />;
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: 'white'
        }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '1rem', background: 'linear-gradient(to right, #4ade80, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Kodály Központ Hostess App
            </h1>
            <p style={{ fontSize: '1.2rem', color: '#94a3b8', marginBottom: '3rem', maxWidth: '600px' }}>
                Üdvözlünk a Kodály Központ hostess beosztás kezelő rendszerében.
                Jelentkezz be a munkák megtekintéséhez és a beosztás kezeléséhez.
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column', width: '100%', maxWidth: '300px' }}>
                <Link to="/login" style={{
                    padding: '1rem',
                    background: 'var(--color-primary)',
                    color: 'white',
                    borderRadius: 'var(--radius-md)',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                    display: 'block'
                }}>
                    Bejelentkezés
                </Link>
                <Link to="/register" style={{
                    padding: '1rem',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    borderRadius: 'var(--radius-md)',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                    display: 'block',
                    border: '1px solid rgba(255,255,255,0.2)'
                }}>
                    Regisztráció
                </Link>
            </div>
        </div>
    );
};

export default Landing;
