import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
    Home,
    Briefcase,
    Bell,
    Calendar,
    HelpCircle,
    Users,
    FileEdit,
    CalendarDays,
    Menu,
    X
} from 'lucide-react';

const Navbar = () => {
    const { user, signOut } = useAuth();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    if (!user) return null;

    useEffect(() => {
        const fetchUnreadCount = async () => {
            if (!user) return;
            try {
                const { count, error } = await supabase
                    .from('notifications')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .eq('read', false);

                if (error) throw error;
                setUnreadCount(count || 0);
            } catch (error) {
                console.error('Error fetching unread notifications:', error);
            }
        };

        fetchUnreadCount();

        // Poll every minute
        const interval = setInterval(fetchUnreadCount, 60000);
        return () => clearInterval(interval);
    }, [user, location.pathname]); // Re-fetch on navigation too, especially when leaving notifications page

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const closeMenu = () => setIsMenuOpen(false);

    // Base links available to everyone (except Profile which is now an icon)
    const baseLinks = [
        { path: '/', label: 'Kezdőlap', icon: Home },
        { path: '/jobs', label: 'Munkák', icon: Briefcase },
        { path: '/notifications', label: 'Értesítések', icon: Bell, badge: unreadCount > 0 },
    ];

    // Links hidden for admins
    const hostessLinks = [
        { path: '/schedule', label: 'Beosztások', icon: Calendar },
        { path: '/quiz', label: 'Kvíz', icon: HelpCircle },
    ];

    const adminLinks = [
        { path: '/users', label: 'Felhasználók', icon: Users },
        { path: '/quiz-editor', label: 'Kvíz Szerk.', icon: FileEdit },
        { path: '/admin/schedule', label: 'Beosztás Szerk.', icon: CalendarDays },
    ];

    const isAdmin = user?.profile?.role === 'admin';

    // Combine links based on role
    const visibleLinks = [
        ...baseLinks,
        ...(!isAdmin ? hostessLinks : []),
        ...(isAdmin ? adminLinks : [])
    ];

    return (
        <nav style={{
            background: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid var(--color-border)',
            position: 'sticky',
            top: 0,
            zIndex: 100
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '0.75rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap'
            }}>
                <Link to="/" onClick={closeMenu} style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', textDecoration: 'none' }}>
                    Kodály Központ
                </Link>

                {/* Hamburger Icon */}
                <button
                    className="show-on-mobile"
                    onClick={toggleMenu}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'white',
                        padding: '0.5rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>

                {/* Desktop Menu */}
                <div className="hide-on-mobile" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    {visibleLinks.map(link => {
                        const Icon = link.icon;
                        return (
                            <Link
                                key={link.path}
                                to={link.path}
                                style={{
                                    color: location.pathname === link.path ? 'var(--color-primary)' : 'var(--color-text)',
                                    fontWeight: location.pathname === link.path ? 'bold' : 'normal',
                                    fontSize: '0.9rem',
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    textDecoration: 'none'
                                }}
                            >
                                <Icon size={18} />
                                {link.label}
                                {link.badge && (
                                    <span style={{
                                        position: 'absolute',
                                        top: '-5px',
                                        right: '-10px',
                                        background: '#ef4444',
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%'
                                    }}></span>
                                )}
                            </Link>
                        );
                    })}

                    {/* Profile Avatar */}
                    <Link to="/profile" title="Profil" style={{ textDecoration: 'none', marginLeft: '0.5rem' }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: location.pathname === '/profile' ? 'var(--color-primary)' : 'var(--color-surface)',
                            border: location.pathname === '/profile' ? '2px solid white' : '1px solid var(--color-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                            transition: 'all 0.2s'
                        }}>
                            {user?.profile?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                        </div>
                    </Link>

                    <button
                        onClick={() => signOut()}
                        style={{
                            padding: '0.4rem 0.8rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--color-border)',
                            background: 'transparent',
                            color: 'var(--color-text)',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                        }}
                    >
                        Kijelentkezés
                    </button>
                </div>

                {/* Mobile Menu Dropdown */}
                {isMenuOpen && (
                    <div className="show-on-mobile" style={{
                        width: '100%',
                        flexBasis: '100%',
                        marginTop: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        paddingTop: '1rem',
                        borderTop: '1px solid var(--color-border)',
                        animation: 'fadeIn 0.3s ease-out'
                    }}>
                        {/* Mobile Profile Link */}
                        <Link
                            to="/profile"
                            onClick={closeMenu}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.5rem 0',
                                color: location.pathname === '/profile' ? 'var(--color-primary)' : 'var(--color-text)',
                                fontWeight: location.pathname === '/profile' ? 'bold' : 'normal'
                            }}
                        >
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'var(--color-surface)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '0.8rem'
                            }}>
                                {user?.profile?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                            </div>
                            Profil
                        </Link>

                        {visibleLinks.map(link => {
                            const Icon = link.icon;
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    onClick={closeMenu}
                                    style={{
                                        color: location.pathname === link.path ? 'var(--color-primary)' : 'var(--color-text)',
                                        fontWeight: location.pathname === link.path ? 'bold' : 'normal',
                                        padding: '0.5rem 0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        textDecoration: 'none'
                                    }}
                                >
                                    <Icon size={18} />
                                    {link.label}
                                    {link.badge && (
                                        <span style={{
                                            background: '#ef4444',
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%'
                                        }}></span>
                                    )}
                                </Link>
                            );
                        })}

                        <button
                            onClick={() => { closeMenu(); signOut(); }}
                            style={{
                                marginTop: '0.5rem',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--color-danger)',
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: 'var(--color-danger)',
                                cursor: 'pointer',
                                width: '100%'
                            }}
                        >
                            Kijelentkezés
                        </button>
                    </div>
                )}
            </div>
        </nav >
    );
};

export default Navbar;
