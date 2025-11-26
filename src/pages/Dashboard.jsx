import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import JobCard from '../components/JobCard';
import CreateJobForm from '../components/CreateJobForm';
import { Plus, Download, X, Settings, Calendar as CalendarIcon, List } from 'lucide-react';
import { createPortal } from 'react-dom';
import SettingsModal from '../components/SettingsModal';
import CalendarView from '../components/CalendarView';
import JobDetailsModal from '../components/JobDetailsModal';
import ReleaseScheduler from '../components/ReleaseScheduler';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showReleaseScheduler, setShowReleaseScheduler] = useState(false);
  const [hourlyRate, setHourlyRate] = useState(1500); // Default fallback
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [selectedJob, setSelectedJob] = useState(null); // For modal
  const [isReleased, setIsReleased] = useState(true);
  const isAdmin = user?.profile?.role === 'admin';

  const months = [
    'Január', 'Február', 'Március', 'Április', 'Május', 'Június',
    'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i); // Last year + next 3

  useEffect(() => {
    fetchJobs();
    fetchSettings();
  }, [user, selectedYear, selectedMonth]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'hourly_rate')
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore not found
      if (data) {
        setHourlyRate(parseInt(data.value));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchJobs = async () => {
    setLoading(true);
    try {
      // Check release status for non-admins
      if (!isAdmin) {
        // 1. Get user's groups
        const { data: userGroups } = await supabase
          .from('user_group_memberships')
          .select('group_id')
          .eq('user_id', user.id);

        const groupIds = userGroups?.map(g => g.group_id) || [];

        // 2. Get releases for this month for these groups
        const { data: releases } = await supabase
          .from('monthly_releases')
          .select('release_at')
          .eq('year', selectedYear)
          .eq('month', selectedMonth + 1) // DB is 1-12
          .in('group_id', groupIds);

        const now = new Date();
        let hasAccess = false;

        if (releases && releases.length > 0) {
          // Check if any release date has passed
          hasAccess = releases.some(r => new Date(r.release_at) <= now);
        }

        const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const selectedMonthStart = new Date(selectedYear, selectedMonth, 1);

        if (selectedMonthStart > currentMonthStart) {
          // Future month
          if (!hasAccess) {
            setJobs([]);
            setIsReleased(false);
            setLoading(false);
            return; // Stop here
          }
        }
      }
      setIsReleased(true);

      // Calculate start and end of selected month
      const startOfMonth = new Date(selectedYear, selectedMonth, 1).toISOString();
      const endOfMonth = new Date(selectedYear, selectedMonth + 1, 1).toISOString();

      // Fetch jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select(`
                    *,
                    applications (
                        id,
                        status,
                        user_id,
                        profiles:user_id (id, full_name, email),
                        give_away_requested,
                        emergency_giveaway_requested
                    )
                `)
        .gte('date', startOfMonth)
        .lt('date', endOfMonth)
        .order('date', { ascending: true });

      if (jobsError) throw jobsError;

      // Fetch user's applications to check 'has_applied'
      const { data: applicationsData, error: appsError } = await supabase
        .from('applications')
        .select('job_id, status, give_away_requested, emergency_giveaway_requested')
        .eq('user_id', user.id);

      if (appsError) throw appsError;

      const appliedJobIds = new Set(applicationsData.map(app => app.job_id));
      const applicationStatusMap = new Map(applicationsData.map(app => [app.job_id, app.status]));
      const giveawayRequestedMap = new Map(applicationsData.map(app => [app.job_id, app.give_away_requested]));
      const emergencyGiveawayMap = new Map(applicationsData.map(app => [app.job_id, app.emergency_giveaway_requested]));

      const formattedJobs = jobsData.map(job => ({
        ...job,
        has_applied: appliedJobIds.has(job.id),
        user_application_status: applicationStatusMap.get(job.id),
        give_away_requested: giveawayRequestedMap.get(job.id),
        emergency_giveaway_requested: emergencyGiveawayMap.get(job.id),
        has_giveaway_requests: job.applications.some(app => app.status === 'approved' && (app.give_away_requested || app.emergency_giveaway_requested)), // Check if ANY approved app has giveaway requested
        assigned_users: job.applications
          .filter(app => app.status === 'approved')
          .map(app => app.profiles)
          .filter(profile => profile) // Filter out null profiles
      })).filter(job => isAdmin || job.is_active !== false)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      setJobs(formattedJobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'white', fontSize: '1rem' }}
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            {months.map((month, index) => (
              <button
                key={month}
                onClick={() => setSelectedMonth(index)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '999px',
                  border: 'none',
                  background: selectedMonth === index ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: selectedMonth === index ? 'white' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s'
                }}
              >
                {month}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', padding: '0.25rem' }}>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '0.5rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: viewMode === 'list' ? 'var(--color-primary)' : 'transparent',
                color: viewMode === 'list' ? 'white' : 'var(--color-text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Lista nézet"
            >
              <List size={20} />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              style={{
                padding: '0.5rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: viewMode === 'calendar' ? 'var(--color-primary)' : 'transparent',
                color: viewMode === 'calendar' ? 'white' : 'var(--color-text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Naptár nézet"
            >
              <CalendarIcon size={20} />
            </button>
          </div>

          {isAdmin && (
            <>
              <button
                onClick={() => setShowReleaseScheduler(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'white', cursor: 'pointer' }}
              >
                <CalendarIcon size={18} /> Közzététel
              </button>
              <button
                onClick={() => setShowSettingsModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'white', cursor: 'pointer' }}
              >
                <Settings size={18} /> Beállítások
              </button>
            </>
          )}
          <button
            onClick={handleSignOut}
            style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }}
          >
            Kijelentkezés
          </button>
        </div>
      </div>

      <h2 style={{ marginBottom: '1.5rem' }}>
        {selectedYear}. {months[selectedMonth]}
      </h2>

      {
        loading ? (
          <p>Munkák betöltése...</p>
        ) : viewMode === 'list' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
            {isAdmin && (
              <div
                onClick={() => setShowCreateModal(true)}
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
                <span style={{ marginTop: '1rem', fontWeight: 'bold' }}>Új Munka Hozzáadása</span>
              </div>
            )}

            {jobs.length === 0 && !isAdmin && (
              <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', textAlign: 'center', gridColumn: '1 / -1' }}>
                {!isReleased ? (
                  <>
                    <h3 style={{ marginBottom: '0.5rem' }}>A beosztás még nem nyilvános</h3>
                    <p style={{ color: 'var(--color-text-muted)' }}>Erre a hónapra még nem tették közzé a munkákat a csoportod számára.</p>
                  </>
                ) : (
                  <p>Jelenleg nincsenek elérhető munkák ebben a hónapban.</p>
                )}
              </div>
            )}

            {jobs.map(job => (
              <JobCard key={job.id} job={job} onApply={fetchJobs} isAdmin={isAdmin} hourlyRate={hourlyRate} />
            ))}
          </div>
        ) : (
          <CalendarView
            jobs={jobs}
            currentDate={new Date(selectedYear, selectedMonth)}
            onJobClick={setSelectedJob}
          />
        )
      }

      {
        showSettingsModal && (
          <SettingsModal
            onClose={() => setShowSettingsModal(false)}
            currentRate={hourlyRate}
            onUpdate={(newRate) => setHourlyRate(newRate)}
          />
        )
      }

      {
        showReleaseScheduler && (
          <ReleaseScheduler
            year={selectedYear}
            month={selectedMonth}
            onClose={() => setShowReleaseScheduler(false)}
          />
        )
      }

      {
        selectedJob && (
          <JobDetailsModal
            job={selectedJob}
            onClose={() => setSelectedJob(null)}
            onApply={fetchJobs}
            isAdmin={isAdmin}
            hourlyRate={hourlyRate}
          />
        )
      }

      {
        showCreateModal && createPortal(
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
                onClick={() => setShowCreateModal(false)}
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
              <CreateJobForm onJobCreated={() => {
                fetchJobs();
                setShowCreateModal(false);
              }} />
            </div>
          </div>,
          document.body
        )
      }
    </div >
  );
};

export default Dashboard;
