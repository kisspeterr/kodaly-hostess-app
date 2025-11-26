import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import JobCard from './JobCard';

const JobDetailsModal = ({ job, onClose, onApply, isAdmin, hourlyRate }) => {
    if (!job) return null;

    return createPortal(
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
            padding: '1rem',
            backdropFilter: 'blur(5px)'
        }} onClick={onClose}>
            <div style={{
                width: '100%',
                maxWidth: '600px',
                position: 'relative',
                maxHeight: '90vh',
                overflowY: 'auto'
            }} onClick={e => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'rgba(0,0,0,0.5)',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        zIndex: 10,
                        padding: '0.5rem',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <X size={20} />
                </button>
                <JobCard
                    job={job}
                    onApply={() => {
                        onApply();
                        onClose();
                    }}
                    isAdmin={isAdmin}
                    hourlyRate={hourlyRate}
                />
            </div>
        </div>,
        document.body
    );
};

export default JobDetailsModal;
