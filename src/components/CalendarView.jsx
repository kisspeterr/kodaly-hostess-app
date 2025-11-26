import { useState } from 'react';

const CalendarView = ({ jobs, currentDate, onJobClick }) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const getDaysInMonth = (year, month) => {
        const date = new Date(year, month, 1);
        const days = [];
        while (date.getMonth() === month) {
            days.push(new Date(date));
            date.setDate(date.getDate() + 1);
        }
        return days;
    };

    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    // Adjust for Monday start (Monday=0, Sunday=6)
    const startPadding = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    const weekDays = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'];

    const getJobsForDay = (date) => {
        return jobs.filter(job => {
            const jobDate = new Date(job.date);
            return jobDate.getDate() === date.getDate() &&
                jobDate.getMonth() === date.getMonth() &&
                jobDate.getFullYear() === date.getFullYear();
        }).sort((a, b) => new Date(a.date) - new Date(b.date));
    };

    return (
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', overflowX: 'auto' }}>
            <div style={{ minWidth: '800px' }}>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', marginBottom: '1rem' }}>
                    {weekDays.map(day => (
                        <div key={day} style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--color-text-muted)', padding: '0.5rem' }}>
                            {day}
                        </div>
                    ))}
                </div>

                {/* Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: 'var(--color-border)', border: '1px solid var(--color-border)' }}>
                    {/* Padding for previous month */}
                    {Array.from({ length: startPadding }).map((_, i) => (
                        <div key={`pad-${i}`} style={{ background: 'var(--color-bg)', minHeight: '120px' }} />
                    ))}

                    {/* Days */}
                    {daysInMonth.map(date => {
                        const dayJobs = getJobsForDay(date);
                        const isToday = new Date().toDateString() === date.toDateString();

                        return (
                            <div key={date.toISOString()} style={{
                                background: 'var(--color-surface)',
                                minHeight: '120px',
                                padding: '0.5rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.25rem',
                                border: isToday ? '2px solid var(--color-primary)' : 'none',
                                borderRadius: isToday ? 'var(--radius-md)' : '0'
                            }}>
                                <div style={{
                                    textAlign: 'right',
                                    marginBottom: '0.25rem',
                                    fontWeight: isToday ? 'bold' : 'normal',
                                    color: isToday ? 'var(--color-primary)' : 'var(--color-text-muted)'
                                }}>
                                    {date.getDate()}
                                </div>

                                {dayJobs.map(job => {
                                    const start = new Date(job.date);
                                    const end = job.end_time ? new Date(job.end_time) : new Date(start.getTime() + 4 * 60 * 60 * 1000);
                                    const durationHours = (end - start) / (1000 * 60 * 60);

                                    return (
                                        <div
                                            key={job.id}
                                            onClick={() => onJobClick(job)}
                                            style={{
                                                background: 'rgba(255,255,255,0.05)',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                cursor: 'pointer',
                                                borderLeft: `3px solid ${job.is_active ? 'var(--color-primary)' : 'var(--color-text-muted)'}`,
                                                overflow: 'hidden',
                                                whiteSpace: 'nowrap',
                                                textOverflow: 'ellipsis',
                                                transition: 'all 0.2s'
                                            }}
                                            title={`${job.title}\n${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${durationHours.toFixed(1)}h)`}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                        >
                                            <div style={{ fontWeight: 'bold' }}>
                                                {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({durationHours.toFixed(1)}h)
                                            </div>
                                            <div>{job.title}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}

                    {/* Padding for next month to fill row (optional, but looks better) */}
                    {Array.from({ length: (7 - (daysInMonth.length + startPadding) % 7) % 7 }).map((_, i) => (
                        <div key={`pad-end-${i}`} style={{ background: 'var(--color-bg)', minHeight: '120px' }} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CalendarView;
