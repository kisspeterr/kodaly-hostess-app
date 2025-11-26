import { useAuth } from '../context/AuthContext';
import AdminHome from './AdminHome';
import HostessHome from './HostessHome';

const Home = () => {
    const { user } = useAuth();

    if (!user) return null;

    if (user.profile?.role === 'admin') {
        return <AdminHome />;
    }

    return <HostessHome />;
};

export default Home;
