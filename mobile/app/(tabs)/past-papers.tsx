import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../../lib/SettingsContext';
import { apiFetch } from '../../lib/api';
import { Ionicons } from '@expo/vector-icons';

interface PastPaper {
  id: string;
  course_id: string;
  course_code?: string;
  title: string;
  year: number;
  exam_type: string;
  question_count?: number;
  questions?: QuizQuestion[];
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
}

export default function PastPapersScreen() {
  const { colors } = useSettings();

  const [papers, setPapers] = useState<PastPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>('all');

  // Exam Simulator Active State
  const [activePaper, setActivePaper] = useState<PastPaper | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes in seconds
  const [examSubmitted, setExamSubmitted] = useState(false);

  const fetchPastPapers = useCallback(async () => {
    try {
      const data = await apiFetch('/past-papers');
      if (Array.isArray(data)) {
        setPapers(data);
      }
    } catch (e: any) {
      console.warn('Past papers fetch failed:', e.message);
      // Fallback sample exam papers for instant practice
      setPapers([
        {
          id: 'demo-1',
          course_id: 'c1',
          course_code: 'CSCD 205',
          title: 'Data Structures & Algorithms Final Exam',
          year: 2025,
          exam_type: 'End of Semester',
          question_count: 5,
          questions: [
            {
              id: 'q1',
              question: 'What is the average time complexity of searching in a Balanced Binary Search Tree (AVL / Red-Black)?',
              options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
              correct_answer: 1,
              explanation: 'In balanced BSTs, the height is guaranteed to be O(log n), so search, insertion, and deletion operate in logarithmic time.',
            },
            {
              id: 'q2',
              question: 'Which data structure follows the Last-In, First-Out (LIFO) principle?',
              options: ['Queue', 'Stack', 'Circular Buffer', 'Priority Queue'],
              correct_answer: 1,
              explanation: 'A Stack strictly enforces LIFO order; the most recently pushed element is the first popped.',
            },
            {
              id: 'q3',
              question: 'What is the worst-case time complexity of QuickSort when a naive pivot is chosen on an already sorted array?',
              options: ['O(n)', 'O(n log n)', 'O(n^2)', 'O(2^n)'],
              correct_answer: 2,
              explanation: 'When the partition is unbalanced (e.g. 0 and n-1 elements), recursion depth becomes n, resulting in O(n^2).',
            },
            {
              id: 'q4',
              question: 'In graph theory, Dijkstra\'s algorithm is used to find:',
              options: ['Minimum Spanning Tree', 'Single-source shortest paths in non-negative weighted graphs', 'Topological sort of a DAG', 'Maximum network flow'],
              correct_answer: 1,
              explanation: 'Dijkstra finds shortest paths from a source vertex to all other vertices in non-negative edge weight graphs.',
            },
            {
              id: 'q5',
              question: 'Which collision resolution technique stores all colliding elements in a linked list at the same hash index?',
              options: ['Linear Probing', 'Quadratic Probing', 'Double Hashing', 'Separate Chaining'],
              correct_answer: 3,
              explanation: 'Separate Chaining uses buckets (commonly linked lists) at each slot of the hash table.',
            },
          ],
        },
        {
          id: 'demo-2',
          course_id: 'c2',
          course_code: 'CPEN 201',
          title: 'Computer Architecture & Digital Logic',
          year: 2025,
          exam_type: 'Mid-Semester Exam',
          question_count: 3,
          questions: [
            {
              id: 'q201',
              question: 'What is the two\'s complement representation of -5 in an 8-bit signed integer?',
              options: ['11111011', '10000101', '11111010', '11111101'],
              correct_answer: 0,
              explanation: '+5 in 8 bits is 00000101. Inverting yields 11111010. Adding 1 gives 11111011.',
            },
            {
              id: 'q202',
              question: 'Which hazard in a pipelined CPU occurs when an instruction depends on the result of an earlier uncompleted instruction?',
              options: ['Structural Hazard', 'Data Hazard', 'Control Hazard', 'Branch Hazard'],
              correct_answer: 1,
              explanation: 'Data hazards occur when read-after-write (RAW) dependencies exist between overlapping pipeline stages.',
            },
            {
              id: 'q203',
              question: 'What logic gate outputs HIGH if and only if an odd number of inputs are HIGH?',
              options: ['NAND', 'NOR', 'XOR', 'XNOR'],
              correct_answer: 2,
              explanation: 'XOR (Exclusive OR) functions as an odd parity generator.',
            },
          ],
        },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPastPapers();
  }, [fetchPastPapers]);

  // Exam Countdown Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activePaper && !examSubmitted && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setExamSubmitted(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activePaper, examSubmitted, timeLeft]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPastPapers();
  };

  const startExamSimulator = (paper: PastPaper) => {
    setActivePaper(paper);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setTimeLeft(paper.questions ? paper.questions.length * 180 : 900); // 3 mins per question
    setExamSubmitted(false);
  };

  const selectAnswer = (questionIndex: number, optionIndex: number) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionIndex]: optionIndex,
    }));
  };

  const handleFinishExam = () => {
    Alert.alert(
      'Submit Exam',
      'Are you sure you want to finish and submit your exam answers?',
      [
        { text: 'Continue Exam', style: 'cancel' },
        { text: 'Submit', style: 'default', onPress: () => setExamSubmitted(true) },
      ]
    );
  };

  const exitSimulator = () => {
    setActivePaper(null);
    setExamSubmitted(false);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const calculateScore = () => {
    if (!activePaper?.questions) return { correct: 0, total: 0, percentage: 0 };
    let correct = 0;
    activePaper.questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correct_answer) {
        correct++;
      }
    });
    const total = activePaper.questions.length;
    return {
      correct,
      total,
      percentage: Math.round((correct / total) * 100),
    };
  };

  // Exam Simulator Active View
  if (activePaper) {
    const questions = activePaper.questions || [];
    const currentQ = questions[currentQuestionIndex];
    const totalQ = questions.length;

    if (examSubmitted) {
      const score = calculateScore();
      return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgPage }]}>
          <ScrollView contentContainerStyle={styles.resultScroll}>
            {/* Score Summary */}
            <View style={[styles.scoreCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View
                style={[
                  styles.scoreCircle,
                  { borderColor: score.percentage >= 60 ? '#10B981' : '#EF4444' },
                ]}
              >
                <Text
                  style={[
                    styles.scorePercentText,
                    { color: score.percentage >= 60 ? '#10B981' : '#EF4444' },
                  ]}
                >
                  {score.percentage}%
                </Text>
              </View>
              <Text style={[styles.scoreTitle, { color: colors.textPrimary }]}>
                {score.percentage >= 70 ? 'Excellent Mastery!' : score.percentage >= 50 ? 'Good Effort!' : 'Needs Review'}
              </Text>
              <Text style={[styles.scoreDesc, { color: colors.textSecondary }]}>
                You answered {score.correct} out of {score.total} questions correctly.
              </Text>

              <TouchableOpacity
                style={[styles.exitBtn, { backgroundColor: colors.primaryViolet }]}
                onPress={exitSimulator}
              >
                <Text style={styles.exitBtnText}>Back to Past Papers</Text>
              </TouchableOpacity>
            </View>

            {/* Questions Review Breakdown */}
            <Text style={[styles.breakdownHeader, { color: colors.textPrimary }]}>Detailed Answer Explanations</Text>
            {questions.map((q, idx) => {
              const selected = userAnswers[idx];
              const isCorrect = selected === q.correct_answer;
              return (
                <View
                  key={q.id || idx}
                  style={[
                    styles.reviewItemCard,
                    {
                      backgroundColor: colors.bgCard,
                      borderColor: isCorrect ? '#10B98150' : '#EF444450',
                    },
                  ]}
                >
                  <View style={styles.reviewHeader}>
                    <Text style={[styles.qNum, { color: colors.textMuted }]}>Question {idx + 1}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: isCorrect ? '#10B98120' : '#EF444420' },
                      ]}
                    >
                      <Text style={{ color: isCorrect ? '#10B981' : '#EF4444', fontWeight: '700', fontSize: 12 }}>
                        {isCorrect ? 'Correct' : 'Incorrect'}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.reviewQuestionText, { color: colors.textPrimary }]}>{q.question}</Text>

                  {/* Option chosen */}
                  <View style={styles.reviewAnswers}>
                    <Text style={[styles.chosenText, { color: isCorrect ? '#10B981' : '#EF4444' }]}>
                      Your Answer: {selected !== undefined ? q.options[selected] : 'Skipped'}
                    </Text>
                    {!isCorrect && (
                      <Text style={[styles.correctAnswerText, { color: '#10B981' }]}>
                        Correct Answer: {q.options[q.correct_answer]}
                      </Text>
                    )}
                  </View>

                  {/* AI Explanation */}
                  {q.explanation && (
                    <View style={[styles.explanationBox, { backgroundColor: colors.bgSubtle }]}>
                      <Ionicons name="bulb-outline" size={16} color={colors.primaryViolet} style={{ marginRight: 6 }} />
                      <Text style={[styles.explanationText, { color: colors.textSecondary }]}>
                        {q.explanation}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgPage }]}>
        {/* Simulator Header */}
        <View style={styles.simHeader}>
          <TouchableOpacity onPress={exitSimulator}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={[styles.timerBadge, { backgroundColor: timeLeft < 300 ? '#EF444420' : colors.bgCard }]}>
            <Ionicons name="time-outline" size={16} color={timeLeft < 300 ? '#EF4444' : colors.primaryViolet} />
            <Text style={[styles.timerText, { color: timeLeft < 300 ? '#EF4444' : colors.textPrimary }]}>
              {formatTimer(timeLeft)}
            </Text>
          </View>
          <TouchableOpacity style={[styles.submitExamBtn, { backgroundColor: colors.primaryViolet }]} onPress={handleFinishExam}>
            <Text style={styles.submitExamText}>Finish</Text>
          </TouchableOpacity>
        </View>

        {/* Question Counter */}
        <View style={styles.questionProgress}>
          <Text style={[styles.progressCount, { color: colors.textSecondary }]}>
            Question {currentQuestionIndex + 1} of {totalQ}
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: colors.bgSubtle }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.primaryViolet,
                  width: `${((currentQuestionIndex + 1) / totalQ) * 100}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Current Question & Options */}
        <ScrollView contentContainerStyle={styles.simBody}>
          <Text style={[styles.simQuestionText, { color: colors.textPrimary }]}>
            {currentQ?.question}
          </Text>

          <View style={styles.optionsWrap}>
            {currentQ?.options.map((opt, optIdx) => {
              const isSelected = userAnswers[currentQuestionIndex] === optIdx;
              const optionLetter = String.fromCharCode(65 + optIdx);
              return (
                <TouchableOpacity
                  key={optIdx}
                  style={[
                    styles.optionItem,
                    {
                      backgroundColor: isSelected ? colors.primaryViolet + '20' : colors.bgCard,
                      borderColor: isSelected ? colors.primaryViolet : colors.border,
                    },
                  ]}
                  onPress={() => selectAnswer(currentQuestionIndex, optIdx)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.optionLetterBadge,
                      {
                        backgroundColor: isSelected ? colors.primaryViolet : colors.bgSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionLetterText,
                        { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                      ]}
                    >
                      {optionLetter}
                    </Text>
                  </View>
                  <Text style={[styles.optionContentText, { color: colors.textPrimary }]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Navigation Footer */}
        <View style={[styles.simFooter, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.navBtn,
              { backgroundColor: colors.bgCard, borderColor: colors.border },
              currentQuestionIndex === 0 && { opacity: 0.4 },
            ]}
            onPress={() => currentQuestionIndex > 0 && setCurrentQuestionIndex(prev => prev - 1)}
            disabled={currentQuestionIndex === 0}
          >
            <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
            <Text style={[styles.navBtnText, { color: colors.textPrimary }]}>Previous</Text>
          </TouchableOpacity>

          {currentQuestionIndex + 1 < totalQ ? (
            <TouchableOpacity
              style={[styles.navBtn, { backgroundColor: colors.primaryViolet }]}
              onPress={() => setCurrentQuestionIndex(prev => prev + 1)}
            >
              <Text style={[styles.navBtnText, { color: '#FFFFFF' }]}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.navBtn, { backgroundColor: '#10B981' }]}
              onPress={handleFinishExam}
            >
              <Text style={[styles.navBtnText, { color: '#FFFFFF' }]}>Submit</Text>
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Papers Catalog View
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgPage }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.catalogScroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryViolet} />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Past Exam Papers</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Practice with verified past university examinations and interactive AI drill simulators.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={colors.primaryViolet} style={{ marginVertical: 30 }} />
        ) : papers.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Ionicons name="document-text-outline" size={40} color={colors.primaryViolet} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No past papers loaded yet</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              Past papers will appear here as your department and course materials sync.
            </Text>
          </View>
        ) : (
          <View style={styles.papersList}>
            {papers.map(paper => (
              <View
                key={paper.id}
                style={[styles.paperCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
              >
                <View style={styles.paperHeader}>
                  <View style={[styles.coursePill, { backgroundColor: colors.primaryViolet + '20' }]}>
                    <Text style={[styles.coursePillText, { color: colors.primaryViolet }]}>
                      {paper.course_code || 'EXAM'}
                    </Text>
                  </View>
                  <Text style={[styles.paperYear, { color: colors.textMuted }]}>{paper.year}</Text>
                </View>

                <Text style={[styles.paperTitle, { color: colors.textPrimary }]}>{paper.title}</Text>
                <Text style={[styles.examTypeLabel, { color: colors.textSecondary }]}>{paper.exam_type}</Text>

                <View style={styles.paperActions}>
                  <TouchableOpacity
                    style={[styles.practiceBtn, { backgroundColor: colors.primaryViolet }]}
                    onPress={() => startExamSimulator(paper)}
                  >
                    <Ionicons name="timer-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.practiceBtnText}>Start Exam Drill</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  catalogScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 30,
    alignItems: 'center',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
  papersList: {
    gap: 14,
  },
  paperCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  paperHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  coursePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  coursePillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  paperYear: {
    fontSize: 12,
    fontWeight: '600',
  },
  paperTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 4,
  },
  examTypeLabel: {
    fontSize: 13,
    marginBottom: 16,
  },
  paperActions: {
    flexDirection: 'row',
    gap: 10,
  },
  practiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
  },
  practiceBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  // Exam Simulator View
  simHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  timerText: {
    fontSize: 15,
    fontWeight: '800',
  },
  submitExamBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  submitExamText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  questionProgress: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  progressCount: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  simBody: {
    padding: 20,
    paddingBottom: 40,
  },
  simQuestionText: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 26,
    marginBottom: 24,
  },
  optionsWrap: {
    gap: 12,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
  },
  optionLetterBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionLetterText: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionContentText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  simFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  navBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },

  // Results Review
  resultScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  scoreCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 28,
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  scorePercentText: {
    fontSize: 28,
    fontWeight: '900',
  },
  scoreTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  scoreDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  exitBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  exitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  breakdownHeader: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  reviewItemCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 14,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  qNum: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  reviewQuestionText: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 12,
  },
  reviewAnswers: {
    gap: 4,
    marginBottom: 12,
  },
  chosenText: {
    fontSize: 13,
    fontWeight: '600',
  },
  correctAnswerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  explanationBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
  },
  explanationText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});
