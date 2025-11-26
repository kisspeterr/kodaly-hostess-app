import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const Quiz = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [score, setScore] = useState(null);

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

            if (data && data.length > 0) {
                // Shuffle questions
                const shuffledQuestions = shuffleArray([...data]).map(q => {
                    // Shuffle answers for each question
                    const originalAnswers = q.answers;
                    const correctAnswerText = originalAnswers[q.correct_answer_index];

                    const shuffledAnswers = shuffleArray([...originalAnswers]);
                    const newCorrectIndex = shuffledAnswers.indexOf(correctAnswerText);

                    return {
                        ...q,
                        answers: shuffledAnswers,
                        correct_answer_index: newCorrectIndex
                    };
                });

                setQuestions(shuffledQuestions);
            } else {
                setQuestions([]);
            }
        } catch (error) {
            console.error('Error fetching questions:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fisher-Yates Shuffle
    const shuffleArray = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    };

    const handleAnswer = (questionId, answerIndex) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: answerIndex
        }));
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            submitQuiz();
        }
    };

    const submitQuiz = async () => {
        setSubmitting(true);
        let correctCount = 0;
        questions.forEach(q => {
            if (answers[q.id] === q.correct_answer_index) {
                correctCount++;
            }
        });

        const calculatedScore = correctCount;
        const totalQuestions = questions.length;
        setScore(calculatedScore);

        try {
            // Fetch current high score
            const { data: profileData } = await supabase
                .from('profiles')
                .select('quiz_score')
                .eq('id', user.id)
                .single();

            const currentHighScore = profileData?.quiz_score || 0;

            // Update if new score is higher
            if (calculatedScore > currentHighScore) {
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        quiz_score: calculatedScore,
                        quiz_total: totalQuestions
                    })
                    .eq('id', user.id);

                if (error) throw error;
                alert(`Új rekord! Elért eredmény: ${calculatedScore} / ${totalQuestions}`);
            } else {
                alert(`Elért eredmény: ${calculatedScore} / ${totalQuestions}. (Rekord: ${currentHighScore})`);
            }

            navigate('/');
        } catch (error) {
            console.error('Error submitting quiz:', error);
            alert(`Hiba az eredmények beküldésekor: ${error.message || 'Ismeretlen hiba'}`);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Kvíz betöltése...</div>;

    const currentQuestion = questions[currentQuestionIndex];

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, padding: '1rem' }}>
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '600px' }}>
                <h2 style={{ marginTop: 0, textAlign: 'center' }}>Hostess Kvíz</h2>

                {/* Progress Bar */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                        <span>Haladás</span>
                        <span>{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--color-surface-hover)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{
                            width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
                            height: '100%',
                            background: 'var(--color-primary)',
                            borderRadius: '999px',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                </div>

                <div style={{ marginBottom: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    {currentQuestionIndex + 1}. kérdés / {questions.length}
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    {currentQuestion.image_url && (
                        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                            <img
                                src={currentQuestion.image_url}
                                alt="Question"
                                style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: 'var(--radius-md)' }}
                            />
                        </div>
                    )}
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>{currentQuestion.question}</h3>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {currentQuestion.answers.map((answer, index) => (
                            <button
                                key={index}
                                onClick={() => handleAnswer(currentQuestion.id, index)}
                                style={{
                                    padding: '1rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--color-border)',
                                    background: answers[currentQuestion.id] === index ? 'var(--color-primary)' : 'var(--color-surface)',
                                    color: 'white',
                                    textAlign: 'left',
                                    transition: 'background 0.2s'
                                }}
                            >
                                {answer}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={handleNext}
                        disabled={answers[currentQuestion.id] === undefined || submitting}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderRadius: 'var(--radius-sm)',
                            border: 'none',
                            background: 'var(--color-primary)',
                            color: 'white',
                            fontWeight: 'bold',
                            opacity: answers[currentQuestion.id] === undefined ? 0.5 : 1,
                            cursor: answers[currentQuestion.id] === undefined ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {currentQuestionIndex === questions.length - 1 ? (submitting ? 'Beküldés...' : 'Befejezés') : 'Következő'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Quiz;
